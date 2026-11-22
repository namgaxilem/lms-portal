"use client";
import { Flame } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Card, Skeleton, cn } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { DayStat, LearningStats } from "@/lib/learning";

/** Noon of a local YYYY-MM-DD day, as unix seconds (for the date formatters). */
function dayUnix(date: string) {
  return Math.floor(new Date(`${date}T12:00:00`).getTime() / 1000);
}

const DAY_MONTH: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit" };

/** "16/11 – 22/11": first and last day of the week in the current locale. */
function weekRange(week: DayStat[], locale: string) {
  const first = formatDate(dayUnix(week[0].date), locale, DAY_MONTH);
  const last = formatDate(dayUnix(week[week.length - 1].date), locale, DAY_MONTH);
  return `${first} – ${last}`;
}

function WeekBars({ week }: { week: DayStat[] }) {
  const t = useT();
  const { locale } = useLocale();
  const max = Math.max(1, ...week.map((d) => d.count));
  return (
    <ul aria-label={t("dashboard.weekChart")} className="mt-5 flex items-end justify-between gap-2">
      {week.map((d) => {
        const unix = dayUnix(d.date);
        const height = d.isFuture ? 8 : 10 + (d.count / max) * 54;
        return (
          <li key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="sr-only">
              {t("dashboard.dayCount", { day: formatDate(unix, locale, { weekday: "long" }), n: d.count })}
            </span>
            <span aria-hidden className="h-4 text-[11px] font-bold tabular-nums text-violet">
              {d.count > 0 ? d.count : ""}
            </span>
            <span aria-hidden className="flex h-16 w-full items-end">
              <span
                className={cn(
                  "w-full rounded-lg",
                  d.isFuture
                    ? "bg-surface-2"
                    : d.count === 0
                      ? "bg-surface-3"
                      : "bg-linear-to-t from-violet-500 to-fuchsia-400",
                  d.isToday && "ring-2 ring-violet-500 ring-offset-2 ring-offset-surface"
                )}
                style={{ height }}
              />
            </span>
            <span aria-hidden className={cn("text-[11px] font-semibold", d.isToday ? "text-violet" : "text-subtle")}>
              {formatDate(unix, locale, { weekday: locale === "vi" ? "narrow" : "short" })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * This week's learning activity, derived from Moodle completion timestamps:
 * completions per day, the weekly total and the day streak. There is no goal:
 * Moodle has no such setting.
 */
export function WeekActivityCard({
  stats,
  loading,
  className,
}: {
  stats: LearningStats | null;
  loading: boolean;
  className?: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const range = stats ? weekRange(stats.week, locale) : null;

  return (
    <section aria-labelledby="dashboard-week" aria-busy={loading || undefined} className={className}>
      <Card className="flex h-full flex-col p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 id="dashboard-week" className="font-extrabold text-fg">
            {t("dashboard.thisWeek")}
          </h2>
          {range && (
            <span className="rounded-full bg-violet-soft px-2.5 py-1 text-xs font-bold tabular-nums text-violet">{range}</span>
          )}
        </div>

        {loading ? (
          <div className="mt-5 space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-6 w-40 rounded-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
              <span className="text-4xl font-extrabold leading-none tracking-tight tabular-nums text-fg">
                {stats?.weekDone ?? 0}
              </span>
              <span className="pb-1 text-sm font-semibold text-muted">{t("dashboard.weekCompleted")}</span>
            </div>
            <div className="mt-3">
              {stats && stats.streak > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                  <Flame size={14} strokeWidth={2.4} className="animate-flicker origin-bottom" aria-hidden />
                  {t("dashboard.streakChip", { n: stats.streak, best: stats.best })}
                </span>
              ) : (
                <p className="text-[13px] text-subtle">{t("shell.streakStart")}</p>
              )}
            </div>
            {stats && <WeekBars week={stats.week} />}
            <p className="mt-auto pt-4 text-xs text-subtle">
              {stats ? `${t("dashboard.totalCompleted", { n: stats.total })} · ` : ""}
              {t("dashboard.weekSource")}
            </p>
          </>
        )}
      </Card>
    </section>
  );
}
