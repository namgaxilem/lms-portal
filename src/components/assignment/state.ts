import type { AssignSubmission, Assignment, SubmissionStatus } from "@/lib/moodle/types";
import { currentSubmission, submissionSettings, type SubmissionSettings } from "./lib";

/** Moodle grading states that mean "the grade is final and visible" (assign renderer). */
const DONE_STATES = new Set(["graded", "released"]);

/** Every state Moodle 4.1–5.x reports in lastattempt.gradingstatus. */
const KNOWN_STATES = new Set([
  "graded",
  "notgraded",
  "notmarked",
  "inmarking",
  "readyforreview",
  "inreview",
  "readyforrelease",
  "released",
]);

/** Effective time limit; `timeLimitOff` once Moodle said the site has time limits disabled. */
function effectiveTimeLimit(a: Assignment, status: SubmissionStatus | null, timeLimitOff: boolean) {
  if (timeLimitOff) return 0;
  return (status?.lastattempt?.timelimit ?? a.timelimit) || 0;
}

/** True while a timed attempt has started and is not submitted (drives the 1s clock). */
export function isTimedRunning(a: Assignment, status: SubmissionStatus | null, timeLimitOff: boolean) {
  const sub = currentSubmission(status, a);
  return effectiveTimeLimit(a, status, timeLimitOff) > 0 && !!sub?.timestarted && sub.status !== "submitted";
}

export interface AssignmentState {
  /**
   * get_submission_status has answered. Until then (or when it failed) every
   * submission-dependent flag stays off, so nothing claims "not submitted".
   */
  known: boolean;
  sub?: AssignSubmission;
  /** new | draft | submitted | reopened */
  subStatus: string;
  settings: SubmissionSettings;
  /** Submissions enabled and at least one submission plugin on. */
  acceptsSubmissions: boolean;
  timelimit: number;
  /** Effective due date: the later of the due date and the user's extension. */
  due: number;
  extension: number;
  cutoff: number;
  submitted: boolean;
  /** Final, visible grade (gradingstatus graded or released, never mid-workflow). */
  graded: boolean;
  /** lastattempt.gradingstatus when Moodle sent a known value. */
  gradingStatus: string | null;
  overdue: boolean;
  late: boolean;
  notOpen: boolean;
  closed: boolean;
  locked: boolean;
  canEdit: boolean;
  needsStart: boolean;
  /** Seconds left in a running timed attempt (may be ≤ 0), else null. */
  timeLeft: number | null;
  /** Length of the running attempt's window, for the timer bar. */
  timeWindow: number;
  /** The running timer stops at the due date (or cut-off), before the time limit runs out. */
  timerEndsAtDue: boolean;
}

/**
 * Derives every flag the student view needs from Moodle's assignment record and
 * submission status at `now` (unix seconds). Follows mod/assign 4.1 rules:
 * submissions_open() for cut-off/extension and get_grading_status() for grading.
 */
export function deriveState(
  a: Assignment,
  status: SubmissionStatus | null,
  now: number,
  timeLimitOff: boolean
): AssignmentState {
  const la = status?.lastattempt;
  const sub = currentSubmission(status, a);
  const settings = submissionSettings(a);
  const acceptsSubmissions = !a.nosubmissions && (settings.onlinetext || settings.file);

  const timelimit = effectiveTimeLimit(a, status, timeLimitOff);
  const subStatus = sub?.status ?? "new";
  const started = sub?.timestarted ?? 0;
  const submitted = subStatus === "submitted";

  const extension = la?.extensionduedate || 0;
  const due = Math.max(a.duedate || 0, extension);
  const cutoff = a.cutoffdate || 0;
  const notOpen = (a.allowsubmissionsfromdate || 0) > now;
  const closed = cutoff > 0 && now > Math.max(cutoff, extension);
  const locked = !!la?.locked;
  // la.canedit is a snapshot from page load: re-check the dates as the clock moves.
  const canEdit = !!la && la.submissionsenabled && la.canedit && !locked && !notOpen && !closed;

  const timedRunning = timelimit > 0 && started > 0 && !submitted;
  // The timer stops at the time limit, capped at this user's effective due date
  // (extension included), else the cut-off. Moodle's timelimit_panel::end_time()
  // caps at the instance due date and ignores extensions; counting the extension
  // keeps the timer in line with the due date the portal shows. Moodle enforces
  // neither: it only labels a submission over time against the time limit.
  const cap = due || cutoff;
  const limitEnd = started + timelimit;
  const timerEndsAtDue = cap > 0 && cap < limitEnd;
  const timerEnd = timerEndsAtDue ? cap : limitEnd;

  const known = !!status;
  const rawGrading = la?.gradingstatus ?? "";
  return {
    known,
    sub,
    subStatus,
    settings,
    acceptsSubmissions,
    timelimit,
    due,
    extension,
    cutoff,
    submitted,
    graded: DONE_STATES.has(rawGrading),
    gradingStatus: KNOWN_STATES.has(rawGrading) ? rawGrading : null,
    overdue: known && due > 0 && now > due && !submitted,
    late: submitted && due > 0 && !!sub && sub.timemodified > due,
    notOpen,
    closed,
    locked,
    canEdit,
    needsStart:
      timelimit > 0 && !started && (subStatus === "new" || subStatus === "reopened") && canEdit,
    timeLeft: timedRunning ? timerEnd - now : null,
    timeWindow: timedRunning ? Math.max(1, timerEnd - started) : 0,
    timerEndsAtDue: timedRunning && timerEndsAtDue,
  };
}

/** i18n key for a grading status (Moodle's markingworkflowstate* strings for workflow states). */
export function gradingStatusKey(state: string | null) {
  if (state === "graded") return "assignment.status.graded";
  if (!state || state === "notgraded") return "assignment.status.notGraded";
  return `grading.workflow.${state}`;
}

export type Remaining = { kind: "left" | "overdue" | "early" | "late" | "underLimit" | "overLimit"; seconds: number };

/** i18n key for each "time remaining" phrase (Moodle's get_time_remaining wording). */
export const REMAINING_KEY: Record<Remaining["kind"], string> = {
  left: "assignment.time.left",
  overdue: "assignment.time.overdue",
  early: "assignment.time.submittedEarly",
  late: "assignment.time.submittedLate",
  underLimit: "assignment.time.underLimit",
  overLimit: "assignment.time.overLimit",
};

/**
 * The "time remaining" line of Moodle's submission status (renderer
 * get_time_remaining): early/late or under/over the time limit once
 * submitted, overdue after the due date, otherwise time left.
 */
export function remainingTime(s: AssignmentState, now: number): Remaining | null {
  if (!s.known || !s.due || !s.acceptsSubmissions) return null;
  const dueReached = now > s.due;
  if (s.submitted && s.sub) {
    const started = s.sub.timestarted ?? 0;
    if (s.timelimit > 0 && started > 0 && !dueReached) {
      const used = s.sub.timemodified - started;
      return used <= s.timelimit
        ? { kind: "underLimit", seconds: s.timelimit - used }
        : { kind: "overLimit", seconds: used - s.timelimit };
    }
    return s.sub.timemodified <= s.due
      ? { kind: "early", seconds: s.due - s.sub.timemodified }
      : { kind: "late", seconds: s.sub.timemodified - s.due };
  }
  if (dueReached) return { kind: "overdue", seconds: now - s.due };
  return { kind: "left", seconds: s.due - now };
}
