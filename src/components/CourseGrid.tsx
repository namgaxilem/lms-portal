"use client";
import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Card, EmptyState } from "@/components/ui";
import { CourseCard, CourseRow } from "@/components/courses/CourseCard";
import { GRID_CLASS, LIST_CLASS } from "@/components/courses/layout";
import { nowSeconds } from "@/lib/courses";
import type { CourseDetails, TimelineCourse } from "@/lib/moodle/types";

export { CourseGridSkeleton } from "@/components/courses/CourseGridSkeleton";

/**
 * The user's courses as cover cards (`grid`) or compact rows (`list`); every
 * item links to /courses/{id}. `details` (core_course_get_courses_by_field)
 * adds teachers and the class/slot, `lastAccess` (unix seconds by course id)
 * adds "opened … ago". Pass `now` (unix seconds) when the caller also sorts or
 * filters by status, so the badges use the same clock. Shows an empty state
 * when `courses` is empty.
 */
export function CourseGrid({
  courses,
  view = "grid",
  details,
  lastAccess,
  now,
}: {
  courses: TimelineCourse[];
  view?: "grid" | "list";
  details?: Map<number, CourseDetails>;
  lastAccess?: Map<number, number>;
  now?: number;
}) {
  const t = useT();
  // Frozen so statuses don't shift between renders.
  const [mountedAt] = useState(nowSeconds);
  const at = now ?? mountedAt;

  if (!courses.length) {
    return (
      <Card>
        <EmptyState icon={GraduationCap} title={t("courses.noCourses")} hint={t("courses.noCoursesHint")} />
      </Card>
    );
  }

  const Item = view === "list" ? CourseRow : CourseCard;
  const items = courses.map((c) => (
    <Item key={c.id} course={c} details={details?.get(c.id)} lastAccess={lastAccess?.get(c.id)} now={at} />
  ));

  if (view === "list") return <div className={LIST_CLASS}>{items}</div>;
  return (
    <div className="@container">
      <div className={GRID_CLASS}>{items}</div>
    </div>
  );
}
