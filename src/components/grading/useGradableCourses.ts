"use client";
import { useMemo } from "react";
import { useMoodle } from "@/lib/client-api";
import { useEnrolledCourses } from "@/lib/moodle/hooks";
import type { Assignment, AssignmentsResult } from "@/lib/moodle/types";

export interface GradableCourse {
  id: number;
  fullname: string;
  shortname: string;
  /** Category name; on some sites this is the class / slot, so same-named courses can be told apart. */
  category?: string;
  courseimage?: string;
  assignments: Assignment[];
}

/**
 * Courses where the user may grade assignments, with those assignments: one
 * mod_assign_get_assignments call filtered by mod/assign:grade (checked at
 * course level), so student enrolments never show up. Category and image come
 * from the (shared, cached) enrolled-course list. Courses without assignments
 * are left out.
 */
export function useGradableCourses() {
  const q = useMoodle<AssignmentsResult>(
    "mod_assign_get_assignments",
    { capabilities: ["mod/assign:grade"] },
    false,
    { cacheMs: 60_000 }
  );
  const { courses: enrolled } = useEnrolledCourses("allincludinghidden");

  const courses = useMemo<GradableCourse[]>(() => {
    const meta = new Map(enrolled.map((c) => [c.id, c]));
    return (q.data?.courses ?? [])
      .filter((c) => c.assignments.length > 0)
      .map((c) => ({
        id: c.id,
        fullname: c.fullname,
        shortname: c.shortname,
        category: meta.get(c.id)?.coursecategory,
        courseimage: meta.get(c.id)?.courseimage,
        assignments: c.assignments,
      }))
      .sort((a, b) => a.fullname.localeCompare(b.fullname, undefined, { numeric: true }));
  }, [q.data, enrolled]);

  return { loading: q.loading, error: q.error, courses };
}
