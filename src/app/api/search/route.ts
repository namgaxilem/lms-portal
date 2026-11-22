import { NextResponse } from "next/server";
import { moodleCall, MoodleError } from "@/lib/moodle/client";
import { portalRouteForMoodleUrl } from "@/lib/moodle/links";
import { clearSession, getSessionUser, getToken } from "@/lib/session";
import { getLocale } from "@/i18n/server";
import { decodeEntities, decodeMoodleText, foldSearch, plainText } from "@/lib/format";
import type { NotificationsResult, TimelineCourse } from "@/lib/moodle/types";
import type {
  ContentHit,
  CourseHit,
  MatchRange,
  NotificationHit,
  PersonHit,
  SearchPayload,
} from "@/lib/search-client";

/** Results per group in the top-bar palette. */
const LIMIT = 8;
/** Results per group on the /search page (`full=1`). */
const FULL_LIMIT = 30;
/** Same bounds as the client (MIN_QUERY / MAX_QUERY in search-client.ts). */
const MIN_QUERY = 2;
const MAX_QUERY = 100;
/** Latest notifications scanned for matches (there is no notification search WS). */
const NOTIFICATION_SCAN = 50;
const MINUTE = 60_000;

/**
 * Global search across the current user's own data. Runs server-side with the
 * httpOnly token (never exposed to the browser) and returns grouped hits:
 *  - courses        : enrolled courses (including ones hidden on the Moodle dashboard)
 *  - people         : core_message_message_search_users (Moodle scopes it to people
 *                     sharing a course or in the user's contacts)
 *  - notifications  : the latest popup notifications
 *  - content        : Moodle global search (4.3+, only with `full=1`, and only when
 *                     the site exposes core_search_get_results and has global search on)
 * Courses and notifications are matched here: case- and accent-insensitive
 * ("tai chinh" finds "Tài chính"), and every word of the query must match.
 * People are matched by Moodle: the whole query as one case-insensitive
 * substring of "firstname lastname", accent-sensitive on MySQL/MariaDB (sql_like
 * compares with a _bin collation), so the UI asks for names with accents.
 * Content is matched by the global search engine. Each hit carries the ranges
 * to highlight. `full=1` (the /search page) returns more hits per group.
 */
export async function GET(request: Request) {
  const [token, user, lang] = await Promise.all([getToken(), getSessionUser(), getLocale()]);
  if (!token || !user) return unauthorized();
  const session: Session = { token, lang };

  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, MAX_QUERY).trim();
  const full = params.get("full") === "1";
  const limit = full ? FULL_LIMIT : LIMIT;
  const tokens = queryTokens(q);
  if (q.length < MIN_QUERY || tokens.length === 0) return NextResponse.json(emptyPayload(q, limit));

  const [courses, people, notifications, content] = await Promise.allSettled([
    searchCourses(session, tokens, limit),
    searchPeople(session, user.id, q, tokens, limit),
    searchNotifications(session, user.id, tokens, limit),
    full ? searchContent(session, q, tokens, limit) : Promise.resolve(null),
  ]);

  const failures = [courses, people, notifications, content].flatMap((r) =>
    r.status === "rejected" ? [r.reason as unknown] : []
  );
  // Expired or revoked token: end the portal session like /api/moodle does.
  if (failures.some((e) => e instanceof MoodleError && e.errorcode === "invalidtoken")) {
    await clearSession();
    return unauthorized();
  }
  // Every core group failed: Moodle is down, which must not look like "no results".
  if (courses.status === "rejected" && people.status === "rejected" && notifications.status === "rejected") {
    const reason = courses.reason;
    const message = reason instanceof MoodleError ? reason.message : "Moodle is unreachable";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const payload: SearchPayload = {
    query: q,
    limit,
    courses: courses.status === "fulfilled" ? courses.value : [],
    people: people.status === "fulfilled" ? people.value : [],
    notifications: notifications.status === "fulfilled" ? notifications.value : [],
    content: content.status === "fulfilled" ? content.value : null,
  };
  return NextResponse.json(payload);
}

function unauthorized() {
  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}

/** Whose Moodle a request reads: the session token and the UI language, as /api/moodle sends them. */
interface Session {
  token: string;
  lang: string;
}

function call<T>(s: Session, wsfunction: string, params: Record<string, unknown> = {}) {
  return moodleCall<T>(s.token, wsfunction, params, { lang: s.lang });
}

function emptyPayload(query: string, limit: number): SearchPayload {
  return { query, limit, courses: [], people: [], notifications: [], content: null };
}

/* ---------------- Groups ---------------- */

/** Timeline course as course_summary_exporter returns it (coursecategory = category name). */
type TimelineCourseRow = TimelineCourse & { coursecategory?: string };

async function searchCourses(s: Session, tokens: string[], limit: number): Promise<CourseHit[]> {
  const courses = await enrolledCourses(s);
  return courses
    .filter((c) => matchesAll([c.fullname, c.shortname], tokens))
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      fullname: c.fullname,
      shortname: c.shortname,
      category: c.coursecategory ?? "",
      courseimage: c.courseimage,
      // hasprogress is false when Moodle tracks no completion (progress is then a fake 0).
      progress: c.hasprogress ? Math.max(0, Math.min(100, Math.round(c.progress ?? 0))) : null,
      hl: { fullname: findRanges(c.fullname, tokens), shortname: findRanges(c.shortname, tokens) },
    }));
}

interface RawMember {
  id: number;
  fullname: string;
  profileimageurl?: string;
  profileimageurlsmall?: string;
  iscontact?: boolean;
  isdeleted?: boolean;
}

/** Moodle matches `q` itself (see GET): only highlighting is done here. */
async function searchPeople(
  s: Session,
  userId: number,
  q: string,
  tokens: string[],
  limit: number
): Promise<PersonHit[]> {
  const r = decodeMoodleText(
    await call<{ contacts?: RawMember[]; noncontacts?: RawMember[] }>(s, "core_message_message_search_users", {
      userid: userId,
      search: q,
      limitnum: limit,
    })
  );
  const seen = new Set<number>([userId]);
  return [...(r.contacts ?? []), ...(r.noncontacts ?? [])]
    .filter((u) => {
      if (!u || u.isdeleted || seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    })
    .slice(0, limit)
    .map((u) => ({
      id: u.id,
      fullname: u.fullname,
      profileimageurl: u.profileimageurlsmall || u.profileimageurl,
      contact: Boolean(u.iscontact),
      hl: { fullname: findRanges(u.fullname, tokens) },
    }));
}

async function searchNotifications(
  s: Session,
  userId: number,
  tokens: string[],
  limit: number
): Promise<NotificationHit[]> {
  const r = decodeMoodleText(
    await call<NotificationsResult>(s, "message_popup_get_popup_notifications", {
      useridto: userId,
      newestfirst: 1,
      limit: NOTIFICATION_SCAN,
      offset: 0,
    })
  );
  return (r.notifications ?? [])
    .map((n) => ({ n, body: plainText(n.smallmessage ?? "") }))
    .filter(({ n, body }) => matchesAll([n.subject, body], tokens))
    .slice(0, limit)
    .map(({ n, body }) => {
      // Some notifications repeat the subject as their small message.
      const excerpt = body === n.subject ? { text: "", ranges: [] } : snippet(body, tokens);
      return {
        id: n.id,
        subject: n.subject,
        snippet: excerpt.text,
        component: n.component ?? "",
        eventtype: n.eventtype ?? "",
        timecreated: n.timecreated,
        read: Boolean(n.read),
        hl: { subject: findRanges(n.subject, tokens), snippet: excerpt.ranges },
      };
    });
}

/** One global search document (core_search\external\document_exporter). Text fields are HTML. */
interface RawSearchDoc {
  itemid: number;
  componentname: string;
  areaname: string;
  title: string;
  content?: string | null;
  docurl: string;
  contexturl: string;
  courseurl: string;
  coursefullname?: string;
  timemodified: number;
}

/** Areas the other groups already cover, or whose pages the portal cannot open. */
const SKIPPED_AREAS = new Set(["core_course-course", "core_course-mycourse", "core_user-user"]);

/** Moodle global search hits that open a portal page; null when the site has no global search. */
async function searchContent(s: Session, q: string, tokens: string[], limit: number): Promise<ContentHit[] | null> {
  if (!(await siteHasGlobalSearch(s))) return null;
  let docs: RawSearchDoc[];
  try {
    const r = await call<{ results?: RawSearchDoc[] }>(s, "core_search_get_results", { query: q, page: 0 });
    docs = r.results ?? [];
  } catch (e) {
    // The WS exists (4.3+) but an admin has not enabled global search.
    if (e instanceof MoodleError && e.errorcode === "globalsearchdisabled") {
      rememberGlobalSearch(false);
      return null;
    }
    throw e;
  }

  const hits: ContentHit[] = [];
  for (const d of docs) {
    if (SKIPPED_AREAS.has(`${d.componentname}-${d.areaname}`)) continue;
    // A forum post's docurl (discuss.php) has no portal page, but its context (the forum) does.
    const href = [d.docurl, d.contexturl, d.courseurl]
      .map((url) => portalRouteForMoodleUrl(url))
      .find((route) => route && route !== "/dashboard");
    if (!href) continue;
    const title = plainText(d.title);
    const excerpt = snippet(plainText(d.content ?? ""), tokens);
    hits.push({
      key: `${d.componentname}-${d.areaname}-${d.itemid}`,
      href,
      title,
      snippet: excerpt.text,
      course: decodeEntities(d.coursefullname ?? ""),
      component: d.componentname,
      timemodified: d.timemodified,
      hl: { title: findRanges(title, tokens), snippet: excerpt.ranges },
    });
    if (hits.length === limit) break;
  }
  return hits;
}

/* ---------------- Moodle data with short server caches ---------------- */

const COURSE_CACHE_MS = MINUTE;
const COURSE_CACHE_MAX = 500;
/** Enrolled courses per token and language, kept a minute so typing does not refetch the whole list per keystroke. */
const courseCache = new Map<string, { at: number; courses: Promise<TimelineCourseRow[]> }>();

function enrolledCourses(s: Session): Promise<TimelineCourseRow[]> {
  const now = Date.now();
  const key = `${s.lang}:${s.token}`;
  const cached = courseCache.get(key);
  if (cached && now - cached.at < COURSE_CACHE_MS) return cached.courses;

  // "allincludinghidden": "all" drops courses the user hid on the Moodle dashboard.
  const courses = call<{ courses?: TimelineCourseRow[] }>(
    s,
    "core_course_get_enrolled_courses_by_timeline_classification",
    { classification: "allincludinghidden", limit: 0, offset: 0, sort: "fullname" }
  ).then((r) => decodeMoodleText(r).courses ?? []);
  courseCache.delete(key);
  courseCache.set(key, { at: now, courses });
  courses.catch(() => {
    if (courseCache.get(key)?.courses === courses) courseCache.delete(key);
  });

  // Oldest entries first (Map keeps insertion order): drop expired ones and any beyond the cap.
  for (const [k, entry] of courseCache) {
    if (courseCache.size <= COURSE_CACHE_MAX && now - entry.at < COURSE_CACHE_MS) break;
    courseCache.delete(k);
  }
  return courses;
}

const GLOBAL_SEARCH_RECHECK_MS = 10 * MINUTE;
/** Whether the site offers global search. Site-wide (one Moodle and one web service per deployment). */
let globalSearch: { at: number; available: Promise<boolean> } | null = null;

function rememberGlobalSearch(available: boolean) {
  globalSearch = { at: Date.now(), available: Promise.resolve(available) };
}

/** core_search_get_results is Moodle 4.3+ and must be in the portal's web service. */
function siteHasGlobalSearch(s: Session): Promise<boolean> {
  if (globalSearch && Date.now() - globalSearch.at < GLOBAL_SEARCH_RECHECK_MS) return globalSearch.available;
  const available = call<{ functions?: { name: string }[] }>(s, "core_webservice_get_site_info").then(
    (info) => (info.functions ?? []).some((f) => f.name === "core_search_get_results"),
    () => {
      globalSearch = null; // Check again on the next request.
      return false;
    }
  );
  globalSearch = { at: Date.now(), available };
  return available;
}

/* ---------------- Matching ---------------- */

/** Text folded for matching, with each folded char's [start, end) in the original string. */
interface Folded {
  text: string;
  start: number[];
  end: number[];
}

/** foldSearch() character by character, keeping track of where each folded char came from. */
function fold(input: string): Folded {
  let text = "";
  const start: number[] = [];
  const end: number[] = [];
  let at = 0;
  for (const ch of input) {
    // foldSearch trims, so whitespace is kept as is (it separates the query words).
    const folded = /\s/.test(ch) ? ch : foldSearch(ch);
    // A lone combining mark (decomposed input) belongs to the letter before it.
    if (!folded && end.length) end[end.length - 1] = at + ch.length;
    for (let i = 0; i < folded.length; i++) {
      start.push(at);
      end.push(at + ch.length);
    }
    text += folded;
    at += ch.length;
  }
  return { text, start, end };
}

/** Distinct folded words of the query. */
function queryTokens(q: string): string[] {
  return [...new Set(fold(q).text.split(/\s+/).filter(Boolean))];
}

/** True when every query word occurs in at least one of the fields. */
function matchesAll(fields: (string | undefined)[], tokens: string[]) {
  const haystack = fields.map((f) => fold(f ?? "").text).join("\n");
  return tokens.every((token) => haystack.includes(token));
}

/**
 * Sorted, merged ranges of the query words inside `value` (offsets into `value`).
 * Single letters are only marked when the query has nothing longer, so
 * "van a" marks "Văn" instead of every "a".
 */
function findRanges(value: string | undefined, tokens: string[]): MatchRange[] {
  if (!value) return [];
  const f = fold(value);
  const words = tokens.filter((token) => token.length > 1);
  const found: MatchRange[] = [];
  for (const token of words.length ? words : tokens) {
    for (let i = f.text.indexOf(token); i !== -1; i = f.text.indexOf(token, i + token.length)) {
      found.push([f.start[i], f.end[i + token.length - 1]]);
    }
  }
  found.sort((a, b) => a[0] - b[0]);
  const merged: MatchRange[] = [];
  for (const [s, e] of found) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  return merged;
}

const SNIPPET_LENGTH = 140;
const SNIPPET_LEAD = 40;

/** Up to SNIPPET_LENGTH chars of `text` around the first match, with shifted highlight ranges. */
function snippet(text: string, tokens: string[]): { text: string; ranges: MatchRange[] } {
  const ranges = findRanges(text, tokens);
  if (text.length <= SNIPPET_LENGTH) return { text, ranges };

  const first = ranges[0]?.[0] ?? 0;
  let from = Math.max(0, first - SNIPPET_LEAD);
  const space = text.indexOf(" ", from);
  if (from > 0 && space !== -1 && space < first) from = space + 1;
  const to = Math.min(text.length, from + SNIPPET_LENGTH);
  const prefix = from > 0 ? "…" : "";
  const shift = prefix.length - from;
  return {
    text: `${prefix}${text.slice(from, to)}${to < text.length ? "…" : ""}`,
    ranges: ranges.filter(([s, e]) => s >= from && e <= to).map(([s, e]) => [s + shift, e + shift]),
  };
}

