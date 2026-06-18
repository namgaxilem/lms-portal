import { NextResponse } from "next/server";
import { moodleLogin, moodleCall, MoodleError } from "@/lib/moodle/client";
import { setSession } from "@/lib/session";
import type { AccountRole, SessionUser, SiteInfo } from "@/lib/moodle/types";

/** Course-admin options that only editing teachers / managers have. */
const TEACHER_OPTIONS = new Set([
  "update",
  "gradebook",
  "coursereports",
  "questionbank",
]);

/** Best-effort highest-role detection. Falls back to "student" on any error. */
async function detectHighestRole(
  token: string,
  userid: number,
  isSiteAdmin: boolean
): Promise<AccountRole> {
  if (isSiteAdmin) return "admin";
  try {
    const courses = await moodleCall<{ id: number }[]>(
      token,
      "core_enrol_get_users_courses",
      { userid }
    );
    const ids = (courses ?? []).map((c) => c.id);
    if (!ids.length) return "student";

    const opts = await moodleCall<{
      courses?: { id: number; options?: { name: string; available: boolean }[] }[];
    }>(token, "core_course_get_user_administration_options", { courseids: ids });

    const isTeacher = opts.courses?.some((c) =>
      c.options?.some((o) => TEACHER_OPTIONS.has(o.name) && o.available)
    );
    return isTeacher ? "teacher" : "student";
  } catch {
    return "student";
  }
}

export async function POST(request: Request) {
  let username: string, password: string;
  try {
    ({ username, password } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required" },
      { status: 400 }
    );
  }

  try {
    const token = await moodleLogin(username, password);
    const info = await moodleCall<SiteInfo>(
      token,
      "core_webservice_get_site_info"
    );

    const isSiteAdmin = Boolean(info.userissiteadmin);
    const highestRole = await detectHighestRole(token, info.userid, isSiteAdmin);

    const user: SessionUser = {
      id: info.userid,
      fullname: info.fullname,
      username: info.username,
      pictureurl: info.userpictureurl,
      sitename: info.sitename,
      isSiteAdmin,
      highestRole,
    };

    await setSession(token, user);
    return NextResponse.json({ user });
  } catch (e) {
    const err = e as MoodleError;
    return NextResponse.json(
      { error: err.message, errorcode: err.errorcode },
      { status: 401 }
    );
  }
}
