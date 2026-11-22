import type { GradingFilling, GuideCriterion, RubricCriterion } from "@/lib/moodle/types";
import type { GradingIssue } from "@/lib/moodle/service-token";

export type { GradingIssue };

/** "other" = an advanced grading plugin other than rubric / marking guide (not supported here). */
type GradingMethod = "simple" | "rubric" | "guide" | "other";

/** GET /api/grading/{cmid}: how one assignment is graded. */
export interface GradingSetup {
  /**
   * "simple" = points / scale / no grade; "rubric" / "guide" = advanced grading;
   * "unknown" = the method could not be read (a non-editing teacher while the
   * grading service is unavailable).
   */
  method: GradingMethod | "unknown";
  /** Max points when graded on points, else null. */
  maxgrade: number | null;
  /** Scale items (1-based when saving) for scale grading; null when not a scale or unreadable. */
  scale: string[] | null;
  rubric?: { definitionid: number; name: string; criteria: RubricCriterion[] };
  guide?: { definitionid: number; name: string; criteria: GuideCriterion[]; comments: string[] };
  /** Advanced grading is selected but its rubric / guide is missing or still a draft, so Moodle grades directly. */
  notDefined?: boolean;
  /** Set when part of the setup could not be read because the grading service failed. */
  issue?: GradingIssue;
}

/** GET /api/grading/{cmid}/fillings?gradeid=: saved rubric / guide fillings of one grade. */
export interface GradingFillingsResult {
  fillings: GradingFilling[];
  /** Set when the fillings could not be read; the form must not be saved then. */
  issue?: GradingIssue;
}

/**
 * Why the grade form is limited (see GradingNotice):
 * - notApplied: Moodle ignored a plain grade, so a rubric / guide is probably active.
 * - advancedUnavailable: rubric / guide in use but its definition or fillings could not be loaded.
 * - advancedUnsupported: an advanced grading method other than rubric / guide.
 * - gradeLocked: the student's grade is locked or overridden in the gradebook (Moodle kept it).
 * - notDefined: the rubric / guide is not ready in Moodle, so Moodle grades directly.
 * - methodUnknown: the grading method could not be confirmed; simple grading still works.
 * - scaleUnavailable: scale items could not be loaded; feedback saves, the grade is kept.
 * - feedbackHidden: marking workflow hides earlier feedback until release; saving replaces it.
 */
export type NoticeKind =
  | "notApplied"
  | "advancedUnavailable"
  | "advancedUnsupported"
  | "gradeLocked"
  | "notDefined"
  | "methodUnknown"
  | "scaleUnavailable"
  | "feedbackHidden";

/** What happened to a plain grade after mod_assign_save_grade. */
export type SaveOutcome = "applied" | "locked" | "blocked";
