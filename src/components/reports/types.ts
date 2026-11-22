/** One learner's completion in a course. */
export interface LearnerProgress {
  done: number;
  total: number;
  /** 0–100. */
  percent: number;
  /** Unix seconds of the latest completion; null when nothing is complete. */
  lastCompleted: number | null;
}

/** What core_completion_get_activities_completion_status says about one user. */
export type CompletionSummary =
  | { status: "tracked"; progress: LearnerProgress }
  /** Moodle does not track completion for this user here (e.g. teachers). */
  | { status: "untracked-user" }
  /** The course has no activity with completion that the viewer can see. */
  | { status: "no-activities" };

/** A learner's completion in the class report; "error" when the request failed or was refused. */
export type LearnerCompletion = CompletionSummary | { status: "error" };
