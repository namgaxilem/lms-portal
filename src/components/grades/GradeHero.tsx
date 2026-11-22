"use client";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BadgeCheck, CircleX, ClipboardCheck, History, Trophy } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Button, HeroCard, ProgressRing } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/format";
import type { TimelineCourse } from "@/lib/moodle/types";
import { type CourseGradeSummary } from "./lib";

function Chip({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-1 text-xs font-semibold text-white">
      <Icon size={14} aria-hidden />
      {children}
    </span>
  );
}

/**
 * Course-coloured banner above the grade items: course total (with max and
 * percentage only when the gradebook shows them), graded count, last update,
 * pass state and rank — each only when Moodle returns it.
 */
export function GradeHero({
  course,
  summary,
  fallbackTotal,
  fallbackRank,
  ready,
  summaryChips = true,
}: {
  course: Pick<TimelineCourse, "id" | "fullname" | "shortname">;
  summary: CourseGradeSummary;
  /** gradereport_overview total, shown until the course's own report has loaded. */
  fallbackTotal: string | null;
  fallbackRank?: number;
  /** The course's grade report has loaded. */
  ready: boolean;
  /** Show the graded-count and last-update chips (off where stat tiles already show them). */
  summaryChips?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const total = summary.total;
  const display = total?.display ?? fallbackTotal;
  const rank = total?.rank ?? fallbackRank ?? null;

  return (
    <HeroCard course compact>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-wide">{course.shortname}</p>
          <h2 className="mt-1 text-lg font-extrabold leading-snug sm:text-xl">{course.fullname}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {summaryChips && ready && summary.gradable > 0 && (
              <Chip icon={ClipboardCheck}>{t("grades.gradedItems", { n: summary.graded, total: summary.gradable })}</Chip>
            )}
            {summaryChips && ready && summary.latest?.dateGraded && (
              <Chip icon={History}>{t("grades.updatedOn", { date: formatDate(summary.latest.dateGraded, locale) })}</Chip>
            )}
            {total?.passed === true && <Chip icon={BadgeCheck}>{t("grades.passed")}</Chip>}
            {total?.passed === false && <Chip icon={CircleX}>{t("grades.failed")}</Chip>}
            {rank && (
              <Chip icon={Trophy}>
                {total?.numUsers
                  ? t("grades.rankOf", { rank, total: total.numUsers })
                  : t("grades.rank", { rank })}
              </Chip>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {total?.percent != null && (
            <ProgressRing value={total.percent} tone="white" size={68} stroke={7} label={t("grades.percentage")}>
              <span className="text-sm font-extrabold tabular-nums">{formatNumber(total.percent, locale, 0)}%</span>
            </ProgressRing>
          )}
          <div className="sm:text-right">
            <p className="text-xs font-semibold">{t("grades.currentTotal")}</p>
            <p className="text-4xl font-extrabold tabular-nums leading-tight">
              {display ?? "–"}
              {display && total?.max != null && (
                <span className="text-base font-bold"> / {formatNumber(total.max, locale)}</span>
              )}
            </p>
            {!display && <p className="text-xs font-semibold">{t("grades.noGradeYet")}</p>}
          </div>
        </div>
      </div>
      <Button href={`/courses/${course.id}`} variant="light" size="sm" className="mt-5">
        {t("grades.openCourse")}
        <ArrowRight size={16} aria-hidden />
      </Button>
    </HeroCard>
  );
}
