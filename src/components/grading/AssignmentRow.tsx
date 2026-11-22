"use client";
import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Badge, IconTile, ProgressRing, Skeleton, cn } from "@/components/ui";
import { formatDateTime, formatNumber } from "@/lib/format";
import { moduleMeta } from "@/lib/module-meta";
import type { Assignment } from "@/lib/moodle/types";
import { gradeTypeOf } from "./lib";
import type { GradingSummary } from "./useGradingSummaries";

const assignMeta = moduleMeta("assign");

/** One assignment in the grading list: dates, grade type and live submission counts. */
export function AssignmentRow({
  assignment: a,
  courseid,
  summary,
  now,
}: {
  assignment: Assignment;
  courseid: number;
  /** undefined while loading, null when unavailable. */
  summary: GradingSummary | null | undefined;
  now: number;
}) {
  const t = useT();
  const { locale } = useLocale();
  const overdue = a.duedate > 0 && a.duedate < now;
  const toGrade = summary?.submissionsneedgradingcount ?? 0;
  const gradeByLate = !!a.gradingduedate && a.gradingduedate < now && toGrade > 0;
  const type = gradeTypeOf(a);

  return (
    <Link
      href={`/teacher/grading/${a.cmid}?course=${courseid}`}
      className="group flex flex-col gap-3 rounded-control p-3 transition hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:flex-row sm:items-center sm:gap-4"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <IconTile icon={assignMeta.icon} tone={assignMeta.tone} />
        <div className="min-w-0">
          <p className="truncate font-bold text-fg">{a.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs tabular-nums text-subtle">
            <span className={cn("inline-flex items-center gap-1", overdue && "text-error-text")}>
              <CalendarClock size={13} strokeWidth={1.85} aria-hidden />
              {a.duedate ? `${t("grading.due")}: ${formatDateTime(a.duedate, locale)}` : t("grading.noDueDate")}
              {overdue && ` · ${t("grading.overdue")}`}
            </span>
            <span aria-hidden>·</span>
            <span>
              {type === "points"
                ? `${t("grading.max")} ${formatNumber(a.grade, locale)}`
                : t(type === "scale" ? "grading.method.scale" : "grading.method.none")}
            </span>
            {!!a.gradingduedate && (
              <>
                <span aria-hidden>·</span>
                <span className={cn(gradeByLate && "font-semibold text-error-text")}>
                  {t("grading.gradeBy", { date: formatDateTime(a.gradingduedate, locale) })}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 pl-[58px] sm:flex-nowrap sm:pl-0">
        {summary === undefined ? (
          <Skeleton className="h-10 w-48" />
        ) : summary ? (
          <SummaryBits summary={summary} />
        ) : null}
        <ChevronRight
          size={18}
          strokeWidth={1.85}
          aria-hidden
          className="ml-auto text-subtle transition-transform group-hover:translate-x-0.5 sm:ml-0"
        />
      </div>
    </Link>
  );
}

function SummaryBits({ summary: s }: { summary: GradingSummary }) {
  const t = useT();
  if (!s.submissionsenabled) return <Badge tone="neutral">{t("grading.offline")}</Badge>;

  const submittedLabel = t("grading.submittedOf", { n: s.submissionssubmittedcount, total: s.participantcount });
  const pct = s.participantcount > 0 ? Math.round((s.submissionssubmittedcount / s.participantcount) * 100) : 0;
  const toGrade = s.submissionsneedgradingcount;

  return (
    <>
      <span className="flex items-center gap-2">
        <ProgressRing value={pct} size={36} stroke={4} tone="success" label={submittedLabel} />
        <span className="text-xs font-semibold tabular-nums text-muted">{submittedLabel}</span>
      </span>
      {toGrade > 0 ? (
        <Badge tone="warning" dot>
          {t("grading.needsGradingCount", { n: toGrade })}
        </Badge>
      ) : s.submissionssubmittedcount > 0 ? (
        <Badge tone="success">{t("grading.allGraded")}</Badge>
      ) : null}
    </>
  );
}
