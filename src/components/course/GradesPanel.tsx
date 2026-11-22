"use client";
import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Card, EmptyState, QueryState, Skeleton } from "@/components/ui";
import { GradeItemsTable } from "@/components/grades/GradeItemsTable";
import { useCourseGradeReport } from "@/components/grades/useCourseGradeReport";

/** Grades tab: the user's grade report for this course, shown like /grades (course total last). */
export function GradesPanel({ courseid, courseName }: { courseid: number; courseName: string }) {
  const t = useT();
  const { loading, error, summary } = useCourseGradeReport(courseid);

  // Moodle's own message (e.g. nopermissiontoviewgrades) is not shown: it is
  // raw and in the user's Moodle profile language.
  if (error) {
    return (
      <Card>
        <EmptyState icon={GraduationCap} title={t("course.grades.unavailable")} />
      </Card>
    );
  }

  return (
    <QueryState loading={loading} error={null} skeleton={<Skeleton className="h-64 w-full rounded-card" />}>
      {summary.rows.length === 0 && !summary.total ? (
        <Card>
          <EmptyState icon={GraduationCap} title={t("reports.noGrades")} />
        </Card>
      ) : (
        <div className="space-y-3">
          <GradeItemsTable summary={summary} courseId={courseid} courseName={courseName} />
          <p className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 text-xs text-subtle">
            <span>{t("course.grades.totalHint")}</span>
            <Link
              href={`/grades?course=${courseid}`}
              className="inline-flex min-h-10 items-center gap-1 font-semibold text-primary-text hover:underline"
            >
              {t("course.grades.openReport")}
              <ArrowRight size={14} aria-hidden />
            </Link>
          </p>
        </div>
      )}
    </QueryState>
  );
}
