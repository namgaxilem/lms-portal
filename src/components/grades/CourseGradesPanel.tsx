"use client";
import { useEffect } from "react";
import { GraduationCap } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { moodleClient } from "@/lib/client-api";
import { useSiteFunctions } from "@/lib/moodle/hooks";
import { courseStyle } from "@/lib/course-color";
import { Card, EmptyState, QueryState, Skeleton } from "@/components/ui";
import type { CourseGradeOverview, TimelineCourse } from "@/lib/moodle/types";
import { GradeHero } from "./GradeHero";
import { GradeItemsTable } from "./GradeItemsTable";
import { overviewGradeText } from "./lib";
import { useCourseGradeReport } from "./useCourseGradeReport";

const VIEW_FN = "gradereport_user_view_grade_report";

/** Logs "grade report viewed" in Moodle, like the mobile app (when the site offers it). */
function useLogReportView(courseid: number) {
  const canLog = useSiteFunctions().has(VIEW_FN);
  useEffect(() => {
    if (canLog) moodleClient(VIEW_FN, { courseid }).catch(() => {});
  }, [canLog, courseid]);
}

function TableSkeleton() {
  return (
    <Card className="space-y-4 p-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-5 w-14" />
        </div>
      ))}
    </Card>
  );
}

/**
 * Detail of /grades for one course. Mount it with `key={course.id}` so a slow
 * response for a previously selected course can never show under another one.
 */
export function CourseGradesPanel({
  course,
  overview,
  summaryChips,
}: {
  course: TimelineCourse;
  overview?: CourseGradeOverview;
  /** See GradeHero; /grades turns them off because its stat tiles show the same. */
  summaryChips?: boolean;
}) {
  const t = useT();
  const { data, loading, error, summary } = useCourseGradeReport(course.id);
  useLogReportView(course.id);

  return (
    <div className="space-y-4" style={courseStyle(course.id)}>
      <GradeHero
        course={course}
        summary={summary}
        fallbackTotal={overviewGradeText(overview?.grade)}
        fallbackRank={overview?.rank}
        ready={!!data}
        summaryChips={summaryChips}
      />
      <QueryState loading={loading} error={error} skeleton={<TableSkeleton />}>
        {summary.rows.length === 0 && !summary.total ? (
          <Card>
            <EmptyState icon={GraduationCap} title={t("reports.noGrades")} />
          </Card>
        ) : (
          <GradeItemsTable summary={summary} courseId={course.id} courseName={course.fullname} />
        )}
      </QueryState>
    </div>
  );
}
