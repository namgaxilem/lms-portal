"use client";
import { useState } from "react";
import { BarChart3, GraduationCap } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useT } from "@/i18n/I18nProvider";
import { CourseSelect } from "@/components/CourseSelect";
import { Card, EmptyState, PageHeader, QueryState } from "@/components/ui";
import { accountRole, isStaffRole } from "@/lib/format";
import { useEnrolledCourses } from "@/lib/moodle/hooks";
import { useCourseView } from "@/components/reports/hooks";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { StaffReport } from "@/components/reports/StaffReport";
import { StudentReport } from "@/components/reports/StudentReport";

/**
 * Course report. The view is decided per course from Moodle permissions:
 * people who can review roles there (teachers, managers, admins) get the class
 * report, everyone else their own progress and grades.
 */
export default function ReportsPage() {
  const t = useT();
  const { user } = useSession();
  const [courseid, setCourseid] = useState<number>();
  const view = useCourseView(courseid);
  // The course list CourseSelect reads (shared cache): its failure and emptiness show here too.
  const enrolled = useEnrolledCourses("allincludinghidden");

  // Until the course's answer arrives, the account-wide role is the best guess.
  const staff = view.kind === "staff" || (view.kind !== "student" && isStaffRole(accountRole(user)));

  return (
    <div>
      <PageHeader
        title={t("nav.reports")}
        description={staff ? t("reports.subtitle") : t("reports.subtitleStudent")}
        actions={<CourseSelect value={courseid} onChange={setCourseid} />}
      />

      {courseid === undefined && enrolled.error ? (
        <QueryState loading={false} error={enrolled.error} onRetry={enrolled.reload}>
          {null}
        </QueryState>
      ) : courseid === undefined && enrolled.data && enrolled.courses.length === 0 ? (
        <Card>
          <EmptyState icon={GraduationCap} title={t("courses.noCourses")} hint={t("courses.noCoursesHint")} />
        </Card>
      ) : courseid === undefined ? (
        <Card>
          <EmptyState
            icon={BarChart3}
            title={staff ? t("reports.selectCourse") : t("reports.selectCourseStudent")}
          />
        </Card>
      ) : view.kind === "loading" ? (
        <QueryState loading error={null} skeleton={<ReportSkeleton />}>
          {null}
        </QueryState>
      ) : view.kind === "error" ? (
        <QueryState loading={false} error={view.error} onRetry={view.retry}>
          {null}
        </QueryState>
      ) : view.kind === "staff" ? (
        <StaffReport key={courseid} courseid={courseid} learnerIds={view.learnerIds} />
      ) : (
        <StudentReport key={courseid} courseid={courseid} />
      )}
    </div>
  );
}
