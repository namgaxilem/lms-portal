/**
 * What an activity date means, from the two places Moodle reports dates:
 * module `dates[]` (core_course_get_contents, mod/{name}/classes/dates.php)
 * and calendar events (eventtype).
 */
export type DateKind = "open" | "close" | "due" | "other";

/** dataid values of mod/{name}/classes/dates.php (Moodle 4.1–5.x). */
const MODULE_DATE_KIND: Record<string, DateKind> = {
  timeopen: "open",
  allowsubmissionsfromdate: "open",
  timeavailablefrom: "open",
  available: "open",
  submissionstart: "open",
  assessmentstart: "open",
  timeclose: "close",
  timeavailableto: "close",
  deadline: "close",
  submissionend: "close",
  assessmentend: "close",
  duedate: "due",
};

/** Kind of a module date (`dates[].dataid`). */
export function moduleDateKind(dataid: string | undefined): DateKind {
  return (dataid && MODULE_DATE_KIND[dataid]) || "other";
}

const EVENT_DATE_KIND: Record<string, DateKind> = {
  open: "open",
  close: "close",
  due: "due",
  gradingdue: "due",
  expectcompletionon: "due",
};

/** Kind of a calendar event date (`eventtype`). */
export function eventDateKind(eventtype: string): DateKind {
  return EVENT_DATE_KIND[eventtype] ?? "other";
}

/**
 * A close or due date that has passed. Moodle's own `overdue` flag is set for
 * every past event (event_exporter_base), so a quiz or SCORM that has only an
 * opening date would otherwise look overdue once it has opened.
 */
export function isPastDeadline(kind: DateKind, time: number, now: number) {
  return time < now && (kind === "close" || kind === "due");
}
