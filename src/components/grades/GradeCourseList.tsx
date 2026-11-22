"use client";
import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, ChevronRight, Search } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Card, CardHeader, EmptyState, Input, Skeleton, cn } from "@/components/ui";
import { CourseMark } from "@/components/courses/CourseMark";
import { courseStyle } from "@/lib/course-color";
import { foldSearch } from "@/lib/format";
import type { CourseGradeOverview, TimelineCourse } from "@/lib/moodle/types";
import { overviewGradeText } from "./lib";

/** Above this many courses the list gets a filter field. */
const SEARCH_FROM = 6;

function gradesHref(courseId: number) {
  return `/grades?course=${courseId}`;
}

/** Course total of a row: loading skeleton, the grade, or a dash ("no grade" only when the overview loaded). */
function RowGrade({ overview, overviewLoading, overviewFailed }: {
  overview?: CourseGradeOverview;
  overviewLoading: boolean;
  overviewFailed: boolean;
}) {
  const t = useT();
  if (overviewLoading) return <Skeleton className="ml-auto h-6 w-10" />;
  const grade = overviewGradeText(overview?.grade);
  return (
    <>
      <span className={cn("block text-lg font-extrabold tabular-nums", grade ? "text-fg" : "text-subtle")}>
        {grade ?? (
          <>
            <span aria-hidden>–</span>
            {!overviewFailed && <span className="sr-only">{t("grades.noGradeYet")}</span>}
          </>
        )}
      </span>
      {overview?.rank ? (
        <span className="block text-2xs font-semibold text-subtle">{t("grades.rank", { rank: overview.rank })}</span>
      ) : null}
    </>
  );
}

function CourseRow({
  course,
  selected,
  ...grade
}: {
  course: TimelineCourse;
  overview?: CourseGradeOverview;
  overviewLoading: boolean;
  overviewFailed: boolean;
  selected: boolean;
}) {
  return (
    <li>
      <Link
        href={gradesHref(course.id)}
        aria-current={selected ? "true" : undefined}
        style={courseStyle(course.id)}
        className={cn(
          "relative flex items-center gap-3 rounded-2xl p-2.5 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          selected ? "bg-course-soft" : "hover:bg-surface-2"
        )}
      >
        {selected && <span aria-hidden className="absolute inset-y-3 left-0 w-1 rounded-full bg-course" />}
        <CourseMark course={course} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-fg">{course.fullname}</span>
          <span className="block truncate text-xs text-subtle">{course.shortname}</span>
        </span>
        <div className="shrink-0 text-right">
          <RowGrade {...grade} />
        </div>
        <ChevronRight size={18} aria-hidden className="shrink-0 text-subtle xl:hidden" />
      </Link>
    </li>
  );
}

function ListSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-2 p-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2.5">
          <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Master list of /grades: every enrolled course with its course total. */
export function GradeCourseList({
  courses,
  grades,
  selectedId,
  loading,
  error,
  overviewLoading,
  overviewError,
}: {
  courses: TimelineCourse[];
  grades: Map<number, CourseGradeOverview>;
  selectedId: number | null;
  loading: boolean;
  error: string | null;
  overviewLoading: boolean;
  overviewError: string | null;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const q = foldSearch(query);
  const shown = q ? courses.filter((c) => foldSearch(`${c.fullname} ${c.shortname}`).includes(q)) : courses;

  return (
    <Card className="animate-fade-in-up">
      <CardHeader title={t("grades.courses")} />
      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <p role="alert" className="m-3 rounded-2xl bg-error-soft p-3 text-[13px] text-error-text">
          {t("common.errorTitle")}: {error}
        </p>
      ) : courses.length === 0 ? (
        <EmptyState compact icon={BookOpen} title={t("courses.noCourses")} />
      ) : (
        <>
          {overviewError && (
            <p role="alert" className="mx-3 mt-2 flex items-start gap-2 rounded-2xl bg-warning-soft p-3 text-[13px] text-warning-text">
              <AlertTriangle size={16} aria-hidden className="mt-0.5 shrink-0" />
              {t("grades.overviewUnavailable")}
            </p>
          )}
          {courses.length > SEARCH_FROM && (
            <div className="px-3 pt-3">
              <Input
                type="search"
                icon={Search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("common.filter")}
                aria-label={t("grades.searchCourses")}
              />
            </div>
          )}
          {shown.length === 0 ? (
            <p role="status" className="p-6 text-center text-[13px] text-subtle">
              {t("search.noResults")}
            </p>
          ) : (
            <ul className="space-y-1 p-3">
              {shown.map((c) => (
                <CourseRow
                  key={c.id}
                  course={c}
                  overview={grades.get(c.id)}
                  overviewLoading={overviewLoading}
                  overviewFailed={!!overviewError}
                  selected={c.id === selectedId}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}
