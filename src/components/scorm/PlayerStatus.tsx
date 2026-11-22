"use client";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Clock, LoaderCircle, TriangleAlert } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Badge, cn } from "@/components/ui";
import type { SaveState } from "@/lib/scorm/player-data";
import { formatClock } from "@/lib/format";
import type { SessionSpan } from "./useScormPlayer";

/**
 * Neutral Badge for attempt / score / time facts. `compact` (phones) drops the
 * pill and keeps icon + value, so several facts fit beside the lesson label.
 */
export function InfoChip({
  icon: Icon,
  compact,
  className,
  children,
  ...props
}: Omit<ComponentProps<"span">, "children"> & { icon: LucideIcon; compact?: boolean; children: ReactNode }) {
  const content = (
    <>
      <Icon size={14} strokeWidth={2} aria-hidden className="shrink-0" />
      {children}
    </>
  );
  if (!compact) {
    return (
      <Badge className={cn("tabular-nums", className)} {...props}>
        {content}
      </Badge>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap text-xs font-semibold tabular-nums text-muted",
        className
      )}
      {...props}
    >
      {content}
    </span>
  );
}

/**
 * Time in the current SCO launch, ticking until the SCO terminates. Its own
 * component so the 1s tick does not re-render the whole player. Mount it with
 * `key={span.start}` so a new launch starts from zero.
 */
export function SessionClock({
  span,
  storedSecs,
  compact,
}: {
  span: SessionSpan;
  storedSecs: number;
  compact?: boolean;
}) {
  const t = useT();
  const [now, setNow] = useState(span.start);
  useEffect(() => {
    if (span.end) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [span.end]);

  const running = !span.end;
  const sessionSecs = ((span.end ?? now) - span.start) / 1000;
  // Once the SCO terminated, Moodle's total_time (in storedSecs) already holds this session.
  const totalSecs = storedSecs + (running ? sessionSecs : 0);
  const clock = formatClock(sessionSecs);
  return (
    <InfoChip
      icon={Clock}
      compact={compact}
      role="timer"
      aria-label={`${t("scorm.session")} ${clock}`}
      title={`${t("scorm.totalTime")}: ${formatClock(totalSecs)}`}
    >
      {clock}
    </InfoChip>
  );
}

type Announcement = "" | "error" | "recovered";

/**
 * Track-saving feedback. "Saving…" / "Progress saved" are visual only: SCOs
 * commit on most slide changes, and announcing each would be noise. The live
 * region speaks only when saving starts failing and when it recovers. Below xl
 * only the icon shows (text in the tooltip), except for errors, which stay
 * fully visible.
 */
export function SaveIndicator({ state }: { state: SaveState }) {
  const t = useT();
  const [announced, setAnnounced] = useState<Announcement>("");
  const next: Announcement =
    state === "error" ? "error" : state === "saved" && announced === "error" ? "recovered" : announced;
  if (next !== announced) setAnnounced(next);

  return (
    <>
      <span role="status" className="sr-only">
        {announced === "error" ? t("scorm.saveError") : announced === "recovered" ? t("scorm.saved") : ""}
      </span>
      {state === "saving" && (
        <span
          aria-hidden
          title={t("scorm.saving")}
          className="inline-flex h-6 items-center gap-1.5 text-xs font-semibold text-subtle"
        >
          <LoaderCircle size={14} strokeWidth={2} className="animate-spin" />
          <span className="max-xl:hidden">{t("scorm.saving")}</span>
        </span>
      )}
      {state === "saved" && (
        <span
          aria-hidden
          title={t("scorm.saved")}
          className="inline-flex h-6 items-center gap-1.5 text-xs font-semibold text-success-text"
        >
          <span className="h-2 w-2 rounded-full bg-success" />
          <span className="max-xl:hidden">{t("scorm.saved")}</span>
        </span>
      )}
      {state === "error" && (
        <span
          aria-hidden
          className="inline-flex h-6 items-center gap-1.5 rounded-full bg-warning-soft px-2.5 text-xs font-semibold text-warning-text"
        >
          <TriangleAlert size={14} strokeWidth={2} />
          {t("scorm.saveError")}
        </span>
      )}
    </>
  );
}
