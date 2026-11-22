"use client";
import { useState } from "react";
import { CircleCheckBig, Info } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { CourseCover } from "@/components/CourseCover";
import { Card, EmptyState, HeroCard, Skeleton, Tabs, tabPanelProps } from "@/components/ui";
import { courseStyle } from "@/lib/course-color";
import { AssignmentRow } from "./AssignmentRow";
import type { GradableCourse } from "./useGradableCourses";
import { useGradingSummaries } from "./useGradingSummaries";

type ListTab = "all" | "needsGrading";

/** The selected course: a colour banner with the to-grade total, then its assignments. */
export function CourseAssignments({ course }: { course: GradableCourse }) {
  const t = useT();
  const [now] = useState(() => Date.now() / 1000);
  const [tab, setTab] = useState<ListTab>("all");
  const summaries = useGradingSummaries(course.assignments.map((a) => a.id));

  const ready = summaries.size === course.assignments.length;
  // null = Moodle returned no grading summary (e.g. separate groups without access to all groups).
  const unknown = course.assignments.some((a) => summaries.get(a.id) === null);
  const known = ready && !unknown;
  const needing = course.assignments.filter((a) => (summaries.get(a.id)?.submissionsneedgradingcount ?? 0) > 0);
  const toGrade = course.assignments.reduce(
    (sum, a) => sum + (summaries.get(a.id)?.submissionsneedgradingcount ?? 0),
    0
  );
  const rows = tab === "all" ? course.assignments : needing;

  return (
    <div className="animate-fade-in-up space-y-5">
      <HeroCard course style={courseStyle(course.id)} className="flex items-center gap-4 sm:gap-5">
        <CourseCover course={course} variant="book" className="hidden w-14 shrink-0 ring-2 ring-white/40 sm:block" />
        <div className="min-w-0 flex-1">
          {course.category && (
            <p className="truncate text-xs font-bold uppercase tracking-wide text-white/80">{course.category}</p>
          )}
          <h2 className="mt-0.5 line-clamp-2 text-lg font-extrabold leading-snug sm:text-xl">{course.fullname}</h2>
          <p className="mt-1 text-[13px] font-medium text-white/85">
            {t("grading.assignmentTotal", { n: course.assignments.length })}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold text-white/80">{t("grading.toGrade")}</p>
          <p
            className="text-3xl font-extrabold tabular-nums sm:text-4xl"
            title={ready && unknown ? t("grading.countsUnavailable") : undefined}
          >
            {known ? toGrade : "–"}
            {ready && unknown && <span className="sr-only">{t("grading.countsUnavailable")}</span>}
          </p>
        </div>
      </HeroCard>

      <Card className="p-2 sm:p-3">
        <Tabs<ListTab>
          id="grading-assignments"
          variant="underline"
          aria-label={t("grading.assignments")}
          className="mx-2 mt-1 sm:mx-3"
          items={[
            { key: "all", label: t("grading.filter.all"), count: course.assignments.length },
            { key: "needsGrading", label: t("grading.filter.needsGrading"), count: known ? needing.length : undefined },
          ]}
          value={tab}
          onChange={setTab}
        />
        <div
          {...tabPanelProps("grading-assignments", tab)}
          className="mt-2 space-y-1 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {tab === "needsGrading" && ready && unknown && (
            <p className="mx-2 flex gap-2 rounded-control bg-surface-2 px-3 py-2 text-[13px] text-muted sm:mx-3">
              <Info size={16} strokeWidth={1.85} aria-hidden className="mt-0.5 shrink-0" />
              {t("grading.countsUnavailable")}
            </p>
          )}
          {tab === "needsGrading" && !ready ? (
            <div role="status" aria-busy="true" className="space-y-2 p-2">
              <span className="sr-only">{t("common.loading")}</span>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : rows.length > 0 ? (
            rows.map((a) => (
              <AssignmentRow key={a.id} assignment={a} courseid={course.id} summary={summaries.get(a.id)} now={now} />
            ))
          ) : known ? (
            <EmptyState compact icon={CircleCheckBig} title={t("grading.nothingToGrade")} />
          ) : null}
        </div>
      </Card>
    </div>
  );
}
