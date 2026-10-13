import "server-only";
import { moodleCall } from "./client";

/**
 * Optional privileged token for read-only grading metadata that the mobile
 * web service does not expose (rubric/marking-guide definitions and fillings,
 * scale items for non-editing teachers). Create a dedicated Moodle external
 * service containing ONLY core_grading_get_definitions,
 * core_grading_get_gradingform_instances and core_course_get_course_module,
 * and issue a token for a manager-role service user.
 *
 * Never send this token or raw responses to the browser; always authorize the
 * request with the user's own token first.
 */
const GRADING_TOKEN = process.env.MOODLE_GRADING_TOKEN ?? "";

export const hasGradingToken = () => !!GRADING_TOKEN;

const ALLOWED = new Set([
  "core_grading_get_definitions",
  "core_grading_get_gradingform_instances",
  "core_course_get_course_module",
]);

export function gradingServiceCall<T>(wsfunction: string, params: Record<string, unknown>) {
  if (!GRADING_TOKEN) throw new Error("MOODLE_GRADING_TOKEN is not configured");
  if (!ALLOWED.has(wsfunction)) throw new Error(`Not allowed: ${wsfunction}`);
  return moodleCall<T>(GRADING_TOKEN, wsfunction, params);
}
