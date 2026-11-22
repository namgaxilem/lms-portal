"use client";
import { useState } from "react";
import { CalendarClock, ChevronDown, ExternalLink } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Badge, Button, Card, RichText, cn } from "@/components/ui";
import { courseStyle } from "@/lib/course-color";
import { formatDateTime } from "@/lib/format";
import { moduleMeta } from "@/lib/module-meta";
import type { Assignment } from "@/lib/moodle/types";
import { gradeTypeOf, type ParticipantFilter } from "./lib";
import type { GradingSetup } from "./types";

const AssignIcon = moduleMeta("assign").icon;

/** grading.method.* key: the advanced method when it applies, else the grade type. */
function methodKey(a: Assignment, setup: GradingSetup | null) {
  const type = gradeTypeOf(a);
  if (type === "none" || !setup) return type;
  if (setup.method === "unknown" || setup.method === "other") return setup.method;
  if ((setup.method === "rubric" || setup.method === "guide") && !setup.notDefined) return setup.method;
  return type;
}

const STAT_TONES = {
  warning: "bg-warning-soft text-warning-text",
  success: "bg-success-soft text-success-text",
  neutral: "bg-surface-2 text-muted",
} as const;

/** Assignment header: course, name, dates, grading method, counts, intro. */
export function AssignmentInfo({
  assignment: a,
  courseName,
  setup,
  counts,
  adminLink,
}: {
  assignment: Assignment;
  courseName?: string;
  setup: GradingSetup | null;
  counts: Record<ParticipantFilter, number>;
  /** "Open in Moodle" escape hatch, site admins only. */
  adminLink?: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const [now] = useState(() => Date.now() / 1000);
  const overdue = a.duedate > 0 && a.duedate < now;

  const stats: { label: string; value: number; tone: keyof typeof STAT_TONES }[] = [
    { label: t("grading.filter.needsGrading"), value: counts.needsGrading, tone: "warning" },
    { label: t("grading.filter.submitted"), value: counts.submitted, tone: "success" },
    { label: t("grading.participants"), value: counts.all, tone: "neutral" },
  ];

  return (
    <Card className="p-4 sm:p-5" style={courseStyle(a.course)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 gap-3.5">
          <span
            aria-hidden
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-course-gradient text-white shadow-course"
          >
            <AssignIcon size={22} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            {courseName && <p className="truncate text-[13px] font-bold text-course">{courseName}</p>}
            <h1 className="text-xl font-extrabold tracking-tight text-fg sm:text-2xl">{a.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge tone={overdue ? "danger" : "neutral"}>
                <CalendarClock size={13} strokeWidth={1.85} aria-hidden />
                <span className="tabular-nums">
                  {a.duedate ? `${t("grading.due")}: ${formatDateTime(a.duedate, locale)}` : t("grading.noDueDate")}
                </span>
                {overdue && <span>· {t("grading.overdue")}</span>}
              </Badge>
              {!!a.gradingduedate && (
                <Badge tone="neutral">
                  <span className="tabular-nums">{t("grading.gradeBy", { date: formatDateTime(a.gradingduedate, locale) })}</span>
                </Badge>
              )}
              <Badge tone="violet">{t(`grading.method.${methodKey(a, setup)}`)}</Badge>
              {!!a.teamsubmission && <Badge tone="accent">{t("grading.teamSubmission")}</Badge>}
              {!!a.blindmarking && <Badge tone="neutral">{t("grading.blindMarking")}</Badge>}
              {!!a.markingworkflow && <Badge tone="neutral">{t("grading.markingWorkflow")}</Badge>}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-start gap-2">
          <dl className="grid flex-1 grid-cols-3 gap-2 xl:flex-none">
            {stats.map((s) => (
              <div
                key={s.label}
                className={cn(
                  "flex flex-col-reverse justify-end rounded-control px-2 py-2 text-center sm:px-3 xl:min-w-24",
                  STAT_TONES[s.tone]
                )}
              >
                <dt className="text-[11px] leading-tight font-semibold text-balance">{s.label}</dt>
                <dd className="text-xl font-extrabold leading-tight tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
          {adminLink && (
            <Button variant="ghost" size="icon-sm" href={adminLink} external aria-label={t("grading.openInMoodle")}>
              <ExternalLink size={16} strokeWidth={1.85} />
            </Button>
          )}
        </div>
      </div>

      {a.intro && (
        <details className="group mt-4 border-t border-line pt-3">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-lg text-[13px] font-semibold text-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            <ChevronDown size={16} strokeWidth={1.85} aria-hidden className="transition-transform group-open:rotate-180" />
            {t("grading.instructions")}
          </summary>
          <RichText html={a.intro} className="mt-3" />
        </details>
      )}
    </Card>
  );
}
