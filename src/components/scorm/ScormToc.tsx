"use client";
import type { LucideIcon } from "lucide-react";
import { Circle, CircleCheck, CircleDot, CirclePlay, CircleX } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Progress, cn } from "@/components/ui";
import type { ScormSco } from "@/lib/moodle/types";
import type { TocItem } from "@/lib/scorm/player-data";

const STATUS: Record<string, { icon: LucideIcon; className: string }> = {
  completed: { icon: CircleCheck, className: "text-success" },
  passed: { icon: CircleCheck, className: "text-success" },
  failed: { icon: CircleX, className: "text-error" },
  incomplete: { icon: CircleDot, className: "text-course" },
  browsed: { icon: CircleDot, className: "text-subtle" },
  notattempted: { icon: Circle, className: "text-line-strong" },
};

interface TocProps {
  items: TocItem[];
  activeId?: number;
  onPick: (sco: ScormSco) => void;
}

/**
 * Current-item highlight shared by the parts list and the course outline: a
 * soft course tint with a course-coloured bar, text in the normal foreground
 * (white on the course gradient fails contrast for most course colours).
 */
export const currentRowClass = "relative bg-course-soft font-bold text-fg";

export function CurrentBar() {
  return <span aria-hidden className="absolute inset-y-2 left-0 w-1 rounded-full bg-course" />;
}

function TocEntry({ item, active, onPick }: { item: TocItem; active: boolean; onPick: TocProps["onPick"] }) {
  const t = useT();
  const { icon: Icon, className } = STATUS[item.status] ?? STATUS.notattempted;
  const unfinished = item.status === "incomplete" || item.status === "browsed";
  const trailing =
    item.score !== undefined
      ? String(item.score)
      : unfinished && item.progress !== undefined
        ? `${Math.round(item.progress * 100)}%`
        : null;
  return (
    <button
      type="button"
      onClick={() => onPick(item.sco)}
      aria-current={active ? "step" : undefined}
      style={{ paddingLeft: 12 + item.level * 14 }}
      className={cn(
        "flex min-h-10 w-full items-center gap-3 rounded-control py-2.5 pr-3 text-left text-[13px] leading-snug transition-colors",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        active ? currentRowClass : "font-medium text-muted hover:bg-surface-2 hover:text-fg"
      )}
    >
      {active && <CurrentBar />}
      {active ? (
        <CirclePlay size={18} strokeWidth={2} aria-hidden className="shrink-0 text-course" />
      ) : (
        <Icon size={18} strokeWidth={2} aria-hidden className={cn("shrink-0", className)} />
      )}
      <span className="min-w-0 flex-1">
        {item.sco.title}
        <span className="sr-only">, {t(`scorm.status.${item.status}`)}</span>
      </span>
      {trailing && <span className="shrink-0 text-xs font-bold tabular-nums text-muted">{trailing}</span>}
    </button>
  );
}

/** "x of y completed" and a course-coloured bar above the parts list. */
function PartsSummary({ done, total }: { done: number; total: number }) {
  const t = useT();
  const label = t("scorm.progress", { done, total });
  return (
    <div className="mb-2 rounded-2xl bg-course-soft px-3.5 py-3">
      <p className="text-xs font-bold text-fg">{label}</p>
      <Progress value={total ? (done / total) * 100 : 0} tone="course" size="sm" label={label} className="mt-2" />
    </div>
  );
}

/** The package's SCO tree: headings for aggregations, buttons for launchable SCOs. */
export function PartsList({ items, activeId, onPick, done, total }: TocProps & { done: number; total: number }) {
  return (
    <>
      <PartsSummary done={done} total={total} />
      <ul className="space-y-1">
        {items.map((item) =>
          item.launchable ? (
            <li key={item.sco.id}>
              <TocEntry item={item} active={item.sco.id === activeId} onPick={onPick} />
            </li>
          ) : (
            <li
              key={item.sco.id}
              style={{ paddingLeft: 12 + item.level * 14 }}
              className="pb-1 pr-3 pt-3 text-2xs font-bold uppercase tracking-wider text-subtle first:pt-1"
            >
              {item.sco.title}
            </li>
          )
        )}
      </ul>
    </>
  );
}
