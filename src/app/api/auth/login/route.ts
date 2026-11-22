import { NextResponse } from "next/server";
import { moodleLogin, moodleCall, MoodleError } from "@/lib/moodle/client";
import { setSession } from "@/lib/session";
import { decodeMoodleText, stripHtml } from "@/lib/format";
import { moodleBase } from "@/lib/public-config";
import type { AccountRole, SessionUser, SiteInfo } from "@/lib/moodle/types";
import type { LoginErrorBody, LoginErrorCode } from "@/lib/login-api";

/** Course-admin options that only editing teachers / managers have. */
const TEACHER_OPTIONS = new Set(["update", "gradebook", "coursereports", "questionbank"]);

/** Best-effort highest-role detection. Falls back to "student" on any error. */
async function detectHighestRole(token: string, userid: number, isSiteAdmin: boolean): Promise<AccountRole> {
  if (isSiteAdmin) return "admin";
  try {
    const courses = await moodleCall<{ id: number }[]>(token, "core_enrol_get_users_courses", { userid });
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

/**
 * Account states in which Moodle's require_login() rejects every web service
 * call (lib/moodlelib.php). login/token.php and core_webservice_get_site_info
 * do not run require_login, so the token is issued anyway.
 */
const ACCOUNT_BLOCKERS = new Set([
  "sitepolicynotagreed",
  "forcepasswordchangenotice",
  "nopasswordchangeforced",
  "usernotfullysetup",
]);

/**
 * Probes a cheap call that validates the system context (and so runs
 * require_login) to surface blocked accounts at sign-in instead of on every
 * page. Runs for site admins too: require_login() checks a forced password
 * change and an incomplete profile before its admin bypass; only the site
 * policy check skips admins (Moodle does that itself). Other failures are ignored.
 */
async function assertAccountUsable(token: string): Promise<void> {
  try {
    await moodleCall(token, "core_user_get_user_preferences", { name: "htmleditor" });
  } catch (e) {
    if (e instanceof MoodleError && e.errorcode && ACCOUNT_BLOCKERS.has(e.errorcode)) throw e;
  }
}

const STATUS: Record<LoginErrorCode, number> = {
  invalidlogin: 401,
  failed: 401,
  badrequest: 400,
  sitepolicynotagreed: 403,
  passwordchange: 403,
  passwordchangeunavailable: 403,
  profileincomplete: 403,
  notconfirmed: 403,
  maintenance: 503,
  serviceunavailable: 503,
  unreachable: 502,
};

/** Moodle errorcodes of login/token.php and require_login() → portal codes. */
const MOODLE_CODES: Record<string, LoginErrorCode> = {
  invalidlogin: "invalidlogin",
  noguest: "invalidlogin",
  sitepolicynotagreed: "sitepolicynotagreed",
  forcepasswordchangenotice: "passwordchange",
  // The auth plugin cannot change passwords: there is no Moodle page to send the user to.
  nopasswordchangeforced: "passwordchangeunavailable",
  passwordisexpired: "passwordchange",
  restoredaccountresetpassword: "passwordchange",
  usernotfullysetup: "profileincomplete",
  usernotconfirmed: "notconfirmed",
  sitemaintenance: "maintenance",
  servicenotavailable: "serviceunavailable",
  enablewsdescription: "serviceunavailable",
};

/** Codes the user resolves on the Moodle website. */
const NEEDS_MOODLE = new Set<LoginErrorCode>(["sitepolicynotagreed", "passwordchange", "profileincomplete"]);

/** The policy link Moodle puts in the sitepolicynotagreed message (`<a href="…">`), if any. */
function policyUrlFrom(message: string): string | undefined {
  const href = message.match(/href="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
  return href && /^https?:\/\//i.test(href) ? href : undefined;
}

function failure(code: LoginErrorCode, error: string, actionUrl?: string) {
  const body: LoginErrorBody = { error, code, ...(actionUrl ? { actionUrl } : {}) };
  return NextResponse.json(body, { status: STATUS[code] });
}

function loginFailure(e: unknown) {
  // Network error, timeout, non-JSON answer, HTTP error (errorcode = status) or MOODLE_URL unset.
  if (!(e instanceof MoodleError) || /^\d{3}$/.test(e.errorcode ?? "")) {
    console.error("[auth] Moodle unreachable during login:", e instanceof Error ? e.message : e);
    return failure("unreachable", "Moodle is unreachable");
  }
  const code = MOODLE_CODES[e.errorcode ?? ""] ?? "failed";
  const message = stripHtml(e.message);
  if (!NEEDS_MOODLE.has(code)) return failure(code, message);
  const fallback = moodleBase() ? `${moodleBase()}/login/index.php` : undefined;
  const actionUrl = code === "sitepolicynotagreed" ? policyUrlFrom(e.message) ?? fallback : fallback;
  return failure(code, message, actionUrl);
}

export async function POST(request: Request) {
  let username: unknown, password: unknown;
  try {
    ({ username, password } = await request.json());
  } catch {
    return failure("badrequest", "Invalid request body");
  }
  if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) {
    return failure("badrequest", "Username and password are required");
  }

  try {
    const token = await moodleLogin(username.trim(), password);
    const info = decodeMoodleText(await moodleCall<SiteInfo>(token, "core_webservice_get_site_info"));

    const isSiteAdmin = Boolean(info.userissiteadmin);
    const [highestRole] = await Promise.all([
      detectHighestRole(token, info.userid, isSiteAdmin),
      assertAccountUsable(token),
    ]);

    // Only these fields are kept (site_info gains sensitive fields in newer
    // Moodle versions). site_info's fullname follows the site's "Full name
    // format" setting: it is the one name shown for the user across the portal.
    const user: SessionUser = {
      id: info.userid,
      fullname: info.fullname,
      firstname: info.firstname,
      username: info.username,
      pictureurl: info.userpictureurl,
      sitename: info.sitename,
      isSiteAdmin,
      highestRole,
    };

    await setSession(token, user);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return loginFailure(e);
  }
}
