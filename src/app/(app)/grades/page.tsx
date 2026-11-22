"use client";
import { use, useState } from "react";
import { useT } from "@/i18n/I18nProvider";
import { BackLink, PageHeader, Skeleton, cn } from "@/components/ui";
import { useEnrolledCourses, useGradesOverview } from "@/lib/moodle/hooks";
import type { CourseGradeOverview, TimelineCourse } from "@/lib/moodle/types";
import { CourseGradesPanel } from "@/components/grades/CourseGradesPanel";
import { GradeCourseList } from "@/components/grades/GradeCourseList";
import { GradeStats } from "@/components/grades/GradeStats";
import { MilestonesCard } from "@/components/grades/MilestonesCard";
import { overviewGradeText } from "@/components/grades/lib";
import { useMediaQuery } from "@/lib/browser-hooks";

/** Default course: an in-progress course with a grade, else any graded, else in progress, else the first. */
function defaultCourse(courses: TimelineCourse[], grades: Map<number, CourseGradeOverview>, now: number) {
  const inProgress = (c: TimelineCourse) => (!c.startdate || c.startdate <= now) && (!c.enddate || c.enddate > now);
  const graded = (c: TimelineCourse) => !!overviewGradeText(grades.get(c.id)?.grade);
  return (
    courses.find((c) => inProgress(c) && graded(c)) ??
    courses.find(graded) ??
    courses.find(inProgress) ??
    courses[0] ??
    null
  );
}

export default function GradesPage({ searchParams }: { searchParams: Promise<{ course?: string | string[] }> }) {
  const t = useT();
  const rawCourse = use(searchParams).course;
  const requestedId = Number(Array.isArray(rawCourse) ? rawCourse[0] : rawCourse) || null;
  const [now] = useState(() => Math.floor(Date.now() / 1000));
  // The detail only mounts where it is visible, so phones don't fetch (and log)
  // a course report the user never opened. Same unit and threshold as Tailwind's
  // `xl` (80rem), so JS and CSS agree whatever the browser's root font size.
  const isDesktop = useMediaQuery("(min-width: 80rem)");

  const { courses, loading, error } = useEnrolledCourses("allincludinghidden");
  const overview = useGradesOverview();

  const requested = courses.find((c) => c.id === requestedId) ?? null;
  const selected = requested ?? (overview.loading ? null : defaultCourse(courses, overview.byCourse, now));
  // Below xl: list first, the detail replaces it once a course is chosen (?course=);
  // an unknown course id falls back to the list.
  const narrowDetail = requestedId !== null && (loading || requested !== null);
  const visible = selected && (isDesktop || narrowDetail) ? selected : null;
  const graded = courses.filter((c) => overviewGradeText(overview.byCourse.get(c.id)?.grade)).length;

  return (
    <div>
      <PageHeader title={t("nav.grades")} description={t("grades.subtitle")} />

      <GradeStats
        graded={graded}
        total={courses.length}
        coursesLoading={loading}
        overviewLoading={overview.loading}
        overviewFailed={!!overview.error || !!error}
        selected={visible}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)]">
        <div className={cn(narrowDetail && "hidden xl:block")}>
          <GradeCourseList
            courses={courses}
            grades={overview.byCourse}
            selectedId={visible?.id ?? null}
            loading={loading}
            error={error}
            overviewLoading={overview.loading}
            overviewError={overview.error}
          />
        </div>

        <div className={cn("space-y-3", !narrowDetail && "hidden xl:block")}>
          <BackLink href="/grades" className="xl:hidden">
            {t("grades.allCourses")}
          </BackLink>
          {visible ? (
            <CourseGradesPanel
              key={visible.id}
              course={visible}
              overview={overview.byCourse.get(visible.id)}
              summaryChips={false}
            />
          ) : (
            (loading || overview.loading) && <Skeleton className="h-48 rounded-hero" />
          )}
        </div>
      </div>

      <MilestonesCard className="mt-8" />
    </div>
  );
}
