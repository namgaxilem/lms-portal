import type { ActivitiesCompletionResult, ActivityCompletionStatus } from "@/lib/moodle/types";
import type { CompletionSummary } from "./types";

/** Complete as Moodle counts it: isoverallcomplete (4.4+), else complete or complete-pass. */
function isStatusDone(s: ActivityCompletionStatus): boolean {
  return s.isoverallcomplete ?? (s.state === 1 || s.state === 2);
}

/**
 * Completed / tracked activities among those the viewer can see. Moodle's own
 * course progress (timeline `progress`) also counts hidden activities and is
 * 100 once the course itself is complete, so it can differ slightly.
 */
export function summariseCompletion({ statuses }: ActivitiesCompletionResult): CompletionSummary {
  if (statuses.some((s) => s.istrackeduser === false)) return { status: "untracked-user" };
  if (statuses.length === 0) return { status: "no-activities" };
  const done = statuses.filter(isStatusDone);
  const last = Math.max(0, ...done.map((s) => s.timecompleted));
  return {
    status: "tracked",
    progress: {
      done: done.length,
      total: statuses.length,
      percent: (done.length / statuses.length) * 100,
      lastCompleted: last > 0 ? last : null,
    },
  };
}

interface ModuleProgress {
  modname: string;
  done: number;
  total: number;
}

/** Completion per activity type, most frequent type first. */
export function progressByModule(statuses: ActivityCompletionStatus[]): ModuleProgress[] {
  const byType = new Map<string, ModuleProgress>();
  for (const s of statuses) {
    const entry = byType.get(s.modname) ?? { modname: s.modname, done: 0, total: 0 };
    entry.total += 1;
    if (isStatusDone(s)) entry.done += 1;
    byType.set(s.modname, entry);
  }
  return [...byType.values()].sort((a, b) => b.total - a.total || a.modname.localeCompare(b.modname));
}
