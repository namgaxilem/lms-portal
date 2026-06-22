import { NextResponse } from "next/server";
import { moodleCall } from "@/lib/moodle/client";
import { getSessionUser, getToken } from "@/lib/session";
import type {
  NotificationsResult,
  SearchResults,
  TimelineCourse,
} from "@/lib/moodle/types";

const LIMIT = 8;

interface RawUser {
  id: number;
  fullname: string;
  profileimageurl?: string;
  profileimageurlsmall?: string;
}

/**
 * Global search across the current user's own data. Runs server-side with the
 * httpOnly token (never exposed to the browser) and returns a grouped payload:
 *  - courses        : the user's enrolled courses matching the query
 *  - notifications  : the user's recent notifications matching the query
 *  - users          : people the user is permitted to message (privilege-scoped
 *                     by Moodle's messaging capability check)
 */
export async function GET(request: Request) {
  const token = await getToken();
  const user = await getSessionUser();
  if (!token || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  const empty: SearchResults = {
    query: q,
    courses: [],
    notifications: [],
    users: [],
  };
  if (q.length < 2) return NextResponse.json(empty);

  const needle = q.toLowerCase();

  const [coursesR, notifsR, usersR] = await Promise.allSettled([
    moodleCall<{ courses: TimelineCourse[] }>(
      token,
      "core_course_get_enrolled_courses_by_timeline_classification",
      { classification: "all", limit: 0, offset: 0, sort: "fullname" }
    ),
    moodleCall<NotificationsResult>(
      token,
      "message_popup_get_popup_notifications",
      { useridto: user.id, newestfirst: 1, limit: 50, offset: 0 }
    ),
    moodleCall<{ contacts?: RawUser[]; noncontacts?: RawUser[] }>(
      token,
      "core_message_message_search_users",
      { userid: user.id, search: q, limitnum: LIMIT }
    ),
  ]);

  const courses: SearchResults["courses"] =
    coursesR.status === "fulfilled"
      ? (coursesR.value.courses ?? [])
          .filter(
            (c) =>
              c.fullname?.toLowerCase().includes(needle) ||
              c.shortname?.toLowerCase().includes(needle)
          )
          .slice(0, LIMIT)
          .map((c) => ({
            id: c.id,
            fullname: c.fullname,
            shortname: c.shortname,
            courseimage: c.courseimage,
          }))
      : [];

  const notifications: SearchResults["notifications"] =
    notifsR.status === "fulfilled"
      ? (notifsR.value.notifications ?? [])
          .filter(
            (n) =>
              n.subject?.toLowerCase().includes(needle) ||
              n.smallmessage?.toLowerCase().includes(needle)
          )
          .slice(0, LIMIT)
          .map((n) => ({
            id: n.id,
            subject: n.subject,
            smallmessage: n.smallmessage,
            timecreated: n.timecreated,
            read: n.read,
          }))
      : [];

  const rawUsers =
    usersR.status === "fulfilled"
      ? [
          ...(usersR.value.contacts ?? []),
          ...(usersR.value.noncontacts ?? []),
        ]
      : [];
  const seen = new Set<number>();
  const users: SearchResults["users"] = rawUsers
    .filter((u) => u && u.id !== user.id && !seen.has(u.id) && seen.add(u.id))
    .slice(0, LIMIT)
    .map((u) => ({
      id: u.id,
      fullname: u.fullname,
      profileimageurl: u.profileimageurlsmall || u.profileimageurl,
    }));

  return NextResponse.json({ query: q, courses, notifications, users });
}
