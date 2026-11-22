"use client";
import { Fragment } from "react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { cn } from "@/components/ui";
import { formatDate, intlLocale } from "@/lib/format";
import type { DayStat } from "@/lib/learning";

const LEVELS = ["bg-surface-3", "bg-primary/30", "bg-primary/55", "bg-primary/80", "bg-primary"];

function level(count: number) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

const toDate = (key: string) => new Date(`${key}T00:00:00`);
const toUnix = (key: string) => Math.floor(toDate(key).getTime() / 1000);

/**
 * Completions per day as a week-by-week grid (columns = weeks, Monday on top),
 * in the brand colour. `days` must be whole weeks starting on a Monday, as
 * LearningStats.heat is. Screen readers get one summary instead of 112 cells.
 */
export function ActivityHeatmap({ days }: { days: DayStat[] }) {
  const t = useT();
  const { locale } = useLocale();
  const tag = intlLocale(locale);
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, w) => days.slice(w * 7, w * 7 + 7));
  const monthFmt = new Intl.DateTimeFormat(tag, { month: "short" });
  const weekdayFmt = new Intl.DateTimeFormat(tag, { weekday: "short" });

  // Month name above the first week of each month. A label needs about two
  // columns, so it is skipped when the next one is too close or at the edge.
  const months = weeks.map((week, w) => {
    const first = toDate(week[0].date);
    return w === 0 || first.getMonth() !== toDate(weeks[w - 1][0].date).getMonth() ? monthFmt.format(first) : null;
  });
  const monthLabels = months.map((m, w) =>
    m && w < weeks.length - 2 && !months.slice(w + 1, w + 3).some(Boolean) ? m : null
  );

  const past = days.filter((d) => !d.isFuture);
  const total = past.reduce((sum, d) => sum + d.count, 0);
  const active = past.filter((d) => d.count > 0).length;

  return (
    <figure className="max-w-2xl">
      <div
        role="img"
        aria-label={t("profile.heatmapSummary", { total, days: active })}
        className="grid items-center gap-[3px] text-2xs text-subtle"
        style={{ gridTemplateColumns: `auto repeat(${weeks.length}, minmax(0, 1fr))` }}
      >
        <span />
        {monthLabels.map((label, w) => (
          <span key={w} className="h-4 whitespace-nowrap leading-4">
            {label}
          </span>
        ))}
        {Array.from({ length: 7 }, (_, row) => (
          <Fragment key={row}>
            <span className="pr-1.5 text-right leading-none">
              {row % 2 === 0 && weeks[0]?.[row] ? weekdayFmt.format(toDate(weeks[0][row].date)) : ""}
            </span>
            {weeks.map((week, w) => {
              const day = week[row];
              if (!day || day.isFuture) return <span key={w} className="aspect-square" />;
              return (
                <span
                  key={w}
                  title={`${formatDate(toUnix(day.date), locale)} · ${t("profile.heatmapCell", { n: day.count })}`}
                  className={cn(
                    "aspect-square rounded-[3px]",
                    LEVELS[level(day.count)],
                    day.isToday && "ring-2 ring-primary ring-offset-1 ring-offset-surface"
                  )}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
      <figcaption className="mt-3 flex items-center justify-end gap-1.5 text-2xs text-subtle">
        {t("profile.less")}
        {LEVELS.map((cls) => (
          <span key={cls} aria-hidden className={cn("h-2.5 w-2.5 rounded-[3px]", cls)} />
        ))}
        {t("profile.more")}
      </figcaption>
    </figure>
  );
}
