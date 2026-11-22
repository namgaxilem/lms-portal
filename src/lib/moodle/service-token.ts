import "server-only";
import { moodleCall, MoodleError } from "./client";

/**
 * Optional privileged token for read-only grading data that the mobile web
 * service does not expose to every grader: rubric / marking-guide definitions
 * and fillings (core_grading_* need moodle/grade:managegradingforms and are not
 * in the mobile service) and scale items / grading method for non-editing
 * teachers. Create a dedicated Moodle external service containing ONLY the
 * functions in ALLOWED and issue a token for a manager-role service user.
 *
 * The token is optional: without it, or when Moodle rejects it, callers get a
 * `GradingIssue` instead of an exception and the portal falls back to simple
 * grading. Never send this token or raw responses to the browser; always
 * authorize the request with the user's own token first.
 */
const GRADING_TOKEN = (process.env.MOODLE_GRADING_TOKEN ?? "").trim();

const ALLOWED = new Set([
  "core_grading_get_definitions",
  "core_grading_get_gradingform_instances",
  "core_course_get_course_module",
]);

/** Why privileged grading data could not be read. */
export type GradingIssue = "no-token" | "token-invalid" | "unavailable";

type GradingCallResult<T> = { ok: true; data: T } | { ok: false; issue: GradingIssue };

/** Errors that mean the token itself is unusable (revoked, expired, service off, user suspended…). */
const TOKEN_ERROR = /^(invalidtoken|accessexception|usernotconfirmed|passwordisexpired|wsaccess\w*)$/;

/** After a token error, skip the token for this long instead of hitting Moodle on every request. */
const RETRY_AFTER_MS = 10 * 60_000;

let invalidUntil = 0;
let absentLogged = false;

/** Health of the grading token in this server process. */
function gradingTokenStatus(): "absent" | "ok" | "invalid" {
  if (!GRADING_TOKEN) return "absent";
  return Date.now() < invalidUntil ? "invalid" : "ok";
}

/**
 * Calls an allowlisted function with the grading token. Never throws for
 * Moodle or network failures: the failure is logged server-side and reported
 * as a GradingIssue so the caller can degrade.
 */
export async function gradingServiceCall<T>(
  wsfunction: string,
  params: Record<string, unknown>,
  { filter = true }: { filter?: boolean } = {}
): Promise<GradingCallResult<T>> {
  if (!ALLOWED.has(wsfunction)) throw new Error(`Not allowed with the grading token: ${wsfunction}`);

  const status = gradingTokenStatus();
  if (status === "absent") {
    if (!absentLogged) {
      absentLogged = true;
      console.info(
        "[grading] MOODLE_GRADING_TOKEN is not set: rubric, marking guide and some scale details are unavailable; teachers get simple grading."
      );
    }
    return { ok: false, issue: "no-token" };
  }
  if (status === "invalid") return { ok: false, issue: "token-invalid" };

  try {
    return { ok: true, data: await moodleCall<T>(GRADING_TOKEN, wsfunction, params, { filter }) };
  } catch (e) {
    const code = e instanceof MoodleError ? (e.errorcode ?? "") : "";
    if (TOKEN_ERROR.test(code)) {
      invalidUntil = Date.now() + RETRY_AFTER_MS;
      console.warn(
        `[grading] Moodle rejected MOODLE_GRADING_TOKEN (${code}): ${(e as Error).message}. ` +
          "Rubric and marking guide grading is disabled for 10 minutes; issue a new token for the grading service."
      );
      return { ok: false, issue: "token-invalid" };
    }
    console.warn(`[grading] ${wsfunction} failed with the grading token: ${code || (e as Error).message}`);
    return { ok: false, issue: "unavailable" };
  }
}
