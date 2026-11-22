"use client";
import { Timer, TriangleAlert } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Progress, cn } from "@/components/ui";
import { formatClock } from "@/lib/format";
import type { AssignmentState } from "./state";

/** i18n key for what the student can still do once the timer has run out. */
function expiredKey(s: AssignmentState) {
  if (s.closed) return "assignment.blocked.closed";
  if (!s.canEdit) return "assignment.blocked.generic";
  // Stopped by the due date: work after it counts as late, not as over the time limit.
  return s.timerEndsAtDue ? "assignment.hero.lateAllowed" : "assignment.timed.expiredHint";
}

/**
 * Countdown for a running timed attempt (Moodle's timer: amber under 15 min,
 * red under 5). When it runs out Moodle still accepts changes until the
 * cut-off; they are marked over time (or late, past the due date).
 */
export function TimerBar({ state: s, timeLeft }: { state: AssignmentState; timeLeft: number }) {
  const t = useT();
  const expired = timeLeft <= 0;
  const tone = timeLeft < 300 ? "danger" : timeLeft < 900 ? "warning" : "normal";

  return (
    <div
      role="timer"
      aria-label={t("assignment.timed.remaining")}
      className={cn(
        "sticky top-20 z-20 rounded-card p-4 shadow-pop ring-1 backdrop-blur-xl",
        tone === "danger" && "bg-error-soft text-error-text ring-error/30",
        tone === "warning" && "bg-warning-soft text-warning-text ring-warning/30",
        tone === "normal" && "bg-surface/90 text-fg ring-line"
      )}
    >
      <div className="flex items-center gap-3">
        {expired ? (
          <TriangleAlert size={20} strokeWidth={1.85} className="shrink-0" aria-hidden />
        ) : (
          <Timer size={20} strokeWidth={1.85} className="shrink-0" aria-hidden />
        )}
        <span className="min-w-0 flex-1 text-sm font-semibold">
          {!expired
            ? t("assignment.timed.remaining")
            : s.timerEndsAtDue
              ? t("assignment.timed.dueReached")
              : t("assignment.timed.timeUp")}
        </span>
        <span className="font-mono text-lg font-extrabold tabular-nums">{formatClock(timeLeft)}</span>
      </div>
      {expired ? (
        <p className="mt-1.5 text-[13px]">{t(expiredKey(s))}</p>
      ) : (
        <Progress
          value={(timeLeft / s.timeWindow) * 100}
          tone="course"
          size="sm"
          className="mt-3"
          label={t("assignment.timed.remaining")}
        />
      )}
    </div>
  );
}
