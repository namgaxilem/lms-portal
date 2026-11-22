"use client";
import { CircleSlash } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Card, EmptyState, IconTile, Progress, ProgressRing, QueryState, Skeleton } from "@/components/ui";
import { CourseGradesPanel } from "@/components/grades/CourseGradesPanel";
import { courseStyle } from "@/lib/course-color";
import { formatNumber, timeAgo } from "@/lib/format";
import { moduleMeta } from "@/lib/module-meta";
import type { TimelineCourse } from "@/lib/moodle/types";
import type { ActivityCompletionStatus } from "@/lib/moodle/types";
import { progressByModule, summariseCompletion } from "./completion";
import { useOwnCompletion, useReportCourse } from "./hooks";
import { ListSkeleton } from "./ReportSkeleton";
import type { LearnerProgress } from "./types";

function ProgressSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="h-22 w-22 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

/** Ring with the course progress, done/total and the latest completion. */
function ProgressOverview({ percent, progress }: { percent: number; progress: LearnerProgress }) {
  const t = useT();
  const { locale } = useLocale();
  return (
    <div className="flex items-center gap-4">
      <ProgressRing value={percent} tone="course" size={88} stroke={9} label={t("reports.courseProgress")}>
        <span className="text-lg font-extrabold tabular-nums text-fg">{formatNumber(percent, locale, 0)}%</span>
      </ProgressRing>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold tabular-nums text-fg">
          {progress.done}
          <span className="text-base font-bold text-subtle">/{progress.total}</span>
        </p>
        <p className="text-[13px] text-muted">{t("reports.activitiesCompleted")}</p>
        {progress.lastCompleted && (
          <p className="mt-1 text-xs text-subtle">
            {t("reports.lastCompleted", { time: timeAgo(progress.lastCompleted, locale) })}
          </p>
        )}
      </div>
    </div>
  );
}

/** Completion per activity type; two columns when the card is wide (stacked layout). */
function ModuleBreakdown({ statuses }: { statuses: ActivityCompletionStatus[] }) {
  const t = useT();
  return (
    <ul className="mt-5 grid gap-3.5 @lg:grid-cols-2 @lg:gap-x-6">
      {progressByModule(statuses).map((m) => {
        const meta = moduleMeta(m.modname);
        const label = t(meta.labelKey);
        return (
          <li key={m.modname} className="flex items-center gap-3">
            <IconTile icon={meta.icon} tone={meta.tone} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
                <span className="truncate font-semibold text-fg">{label}</span>
                <span className="shrink-0 tabular-nums text-subtle">
                  {m.done}/{m.total}
                </span>
              </div>
              <Progress value={(m.done / m.total) * 100} tone={m.done === m.total ? "success" : "course"} size="sm" label={label} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The learner's own completion in the course, overall and per activity type.
 * The ring shows Moodle's course progress, as the dashboard and course cards
 * do; the counts and the breakdown come from the activity statuses.
 */
function CourseProgressCard({
  courseid,
  course,
  courseLoading,
}: {
  courseid: number;
  course: TimelineCourse | undefined;
  courseLoading: boolean;
}) {
  const t = useT();
  const { statuses, loading, error } = useOwnCompletion(courseid);
  const summary = summariseCompletion({ statuses });

  return (
    <Card className="@container p-5" style={courseStyle(courseid)}>
      <h2 className="text-base font-bold text-fg">{t("reports.yourProgress")}</h2>
      <p className="mt-0.5 text-[13px] text-subtle">{t("reports.progressDerived")}</p>
      <div className="mt-4">
        <QueryState loading={loading || courseLoading} error={error} skeleton={<ProgressSkeleton />}>
          {summary.status === "tracked" ? (
            <>
              <ProgressOverview
                percent={course?.hasprogress ? (course.progress ?? 0) : summary.progress.percent}
                progress={summary.progress}
              />
              <ModuleBreakdown statuses={statuses} />
            </>
          ) : (
            <EmptyState
              icon={CircleSlash}
              compact
              title={summary.status === "untracked-user" ? t("reports.notTrackedSelf") : t("reports.completionNotTracked")}
            />
          )}
        </QueryState>
      </div>
    </Card>
  );
}

/**
 * Learner view of one course: the learner's completion progress (the signal
 * most courses have) and the course's grade report (shared with /grades).
 * Side by side only on very wide screens, where the grade table keeps room
 * for its columns. Mount with `key={courseid}`.
 */
export function StudentReport({ courseid }: { courseid: number }) {
  const t = useT();
  const { course, loading, error } = useReportCourse(courseid);

  return (
    <div className="grid gap-6 animate-fade-in-up 2xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:items-start">
      <div className="min-w-0 2xl:col-start-2 2xl:row-start-1">
        <CourseProgressCard courseid={courseid} course={course} courseLoading={loading} />
      </div>
      <div className="min-w-0 2xl:col-start-1 2xl:row-start-1">
        {course ? (
          <CourseGradesPanel course={course} />
        ) : (
          <QueryState
            loading={loading}
            error={error}
            skeleton={
              <div className="space-y-4">
                <Skeleton className="h-40 w-full rounded-hero" />
                <ListSkeleton rows={5} />
              </div>
            }
          >
            <Card>
              <EmptyState title={t("reports.noGrades")} />
            </Card>
          </QueryState>
        )}
      </div>
    </div>
  );
}
