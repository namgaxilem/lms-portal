/**
 * Learning statistics computed from Moodle activity-completion timestamps
 * (core_completion_get_activities_completion_status → timecompleted). Moodle
 * has no "streak" or "goal" concept; these are portal-side views of real data.
 */
import { dayKey } from "@/lib/format";

export interface DayStat {
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  count: number;
  isToday: boolean;
  isFuture: boolean;
}

export interface LearningStats {
  /** Activities completed (all time). */
  total: number;
  /** Consecutive days with a completion, ending today (or yesterday). */
  streak: number;
  /** Longest such run. */
  best: number;
  /** Current week, Monday → Sunday. */
  week: DayStat[];
  /** Completions this week. */
  weekDone: number;
  /** Last 16 weeks, Monday-first columns (16 × 7 = 112 days). */
  heat: DayStat[];
  /** Days with at least one completion within `heat`. */
  activeDays: number;
}

const DAY = 86_400_000;

/** "YYYY-MM-DD" of a local date. */
const keyOf = (d: Date) => dayKey(d.getTime() / 1000);

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Monday 00:00 of the week containing `d` (local time). */
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

/** @param completedAt unix seconds of each completed activity */
export function computeLearningStats(completedAt: number[], now: Date = new Date()): LearningStats {
  const counts = new Map<string, number>();
  for (const ts of completedAt) {
    if (!ts || ts <= 0) continue;
    const k = dayKey(ts);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const today = startOfDay(now);
  const todayKey = keyOf(today);
  const stat = (d: Date): DayStat => {
    const k = keyOf(d);
    return { date: k, count: counts.get(k) ?? 0, isToday: k === todayKey, isFuture: d.getTime() > today.getTime() };
  };

  // Current streak: today counts if active; otherwise the run may end yesterday.
  let streak = 0;
  const cursor = new Date(today);
  if (!counts.get(todayKey)) cursor.setDate(cursor.getDate() - 1);
  while (counts.get(keyOf(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Best run over all active days.
  const days = [...counts.keys()].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const k of days) {
    const t = new Date(`${k}T00:00:00`).getTime();
    run = prev !== null && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }

  const monday = startOfWeek(today);
  const week = Array.from({ length: 7 }, (_, i) => stat(new Date(monday.getTime() + i * DAY + 12 * 3_600_000)));
  const heatStart = new Date(monday);
  heatStart.setDate(heatStart.getDate() - 15 * 7);
  const heat = Array.from({ length: 16 * 7 }, (_, i) => {
    const d = new Date(heatStart);
    d.setDate(d.getDate() + i);
    return stat(d);
  });

  return {
    total: completedAt.filter((t) => t > 0).length,
    streak,
    best,
    week,
    weekDone: week.reduce((s, d) => s + d.count, 0),
    heat,
    activeDays: heat.filter((d) => d.count > 0).length,
  };
}

/* ---------------- Milestones ---------------- */

export type MilestoneKey = "first" | "ten" | "fifty" | "streak3" | "streak7" | "courseDone";

export interface Milestone {
  key: MilestoneKey;
  done: boolean;
  /** Current value towards `target`. */
  value: number;
  target: number;
}

/**
 * Portal-defined learning milestones (not Moodle badges, which may be disabled
 * on a site): every rule is a simple threshold on real Moodle data.
 */
export function computeMilestones(stats: LearningStats, courseProgress: number[]): Milestone[] {
  const bestCourse = Math.max(0, ...courseProgress.map((p) => Math.round(p)));
  const m = (key: MilestoneKey, value: number, target: number): Milestone => ({
    key,
    value: Math.min(value, target),
    target,
    done: value >= target,
  });
  return [
    m("first", stats.total, 1),
    m("streak3", stats.best, 3),
    m("ten", stats.total, 10),
    m("streak7", stats.best, 7),
    m("fifty", stats.total, 50),
    m("courseDone", bestCourse, 100),
  ];
}
