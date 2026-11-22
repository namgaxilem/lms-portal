"use client";
import type { ReactNode } from "react";
import { CourseCover } from "@/components/CourseCover";
import { HeroCard, Skeleton } from "@/components/ui";
import { courseStyle } from "@/lib/course-color";
import type { TimelineCourse } from "@/lib/moodle/types";

/**
 * Course-coloured banner at the top of a course report: cover, short name and
 * full name on the left, `aside` (a ring, a total…) on the right, `children`
 * (chips, actions) under the name. If the course is missing from the
 * enrolment list, `aside` and `children` still render in a plain band.
 */
export function CourseBand({
  courseid,
  course,
  loading,
  aside,
  children,
}: {
  courseid: number;
  course: TimelineCourse | undefined;
  loading: boolean;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  if (!course) {
    if (loading) return <Skeleton className="h-36 w-full rounded-hero" />;
    if (!aside && !children) return null;
    return (
      <HeroCard course style={courseStyle(courseid)}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
          {aside && <div className="shrink-0">{aside}</div>}
        </div>
      </HeroCard>
    );
  }
  return (
    <HeroCard course style={courseStyle(course.id)}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div aria-hidden className="hidden w-24 shrink-0 sm:block">
          <CourseCover course={course} variant="book" className="ring-4 ring-white/25" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold uppercase tracking-wide text-white">{course.shortname}</p>
          <h2 className="mt-1 text-lg font-extrabold leading-snug sm:text-xl">{course.fullname}</h2>
          {children && <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </HeroCard>
  );
}
