import type { Tone } from "@/components/ui";
import type { CourseStatus } from "@/lib/courses";
import { foldSearch } from "@/lib/format";
import { buildOutline, flattenOutline, forCoursePage, isModuleDone, isTracked } from "@/lib/moodle/course-outline";
import type { CourseDetails, CourseModule, CourseSection, TimelineCourse } from "@/lib/moodle/types";

/* ---------------- Status ---------------- */

/** Label key and badge tone for each status, in tab order. */
export const STATUS_META: Record<CourseStatus, { labelKey: string; tone: Tone }> = {
  inProgress: { labelKey: "courses.inProgress", tone: "primary" },
  upcoming: { labelKey: "courses.upcoming", tone: "violet" },
  completed: { labelKey: "courses.completed", tone: "success" },
  ended: { labelKey: "courses.ended", tone: "neutral" },
};

export const COURSE_STATUSES = Object.keys(STATUS_META) as CourseStatus[];

/**
 * First activity in course order that Moodle tracks for this user and that is
 * not complete yet, with the name of its top-level section. Staff get
 * completion data with istrackeduser=false, so they never have one; stealth
 * modules are skipped as on the learner's course page.
 */
export function firstUnfinished(sections: CourseSection[]): { mod: CourseModule; section: string } | null {
  for (const section of buildOutline(forCoursePage(sections, false))) {
    const mod = flattenOutline([section]).find((m) => m.uservisible !== false && isTracked(m) && !isModuleDone(m));
    if (mod) return { mod, section: section.name };
  }
  return null;
}

/* ---------------- Display helpers ---------------- */

/** Class/slot the course belongs to: the category name. */
export function courseCategory(c: TimelineCourse, details?: CourseDetails) {
  return details?.categoryname || c.coursecategory || "";
}

/** The course is hidden from students in Moodle (only staff receive such courses). */
export function isHiddenFromStudents(c: Pick<TimelineCourse, "visible">) {
  return c.visible === false;
}

/** An uploaded course image; Moodle's generated SVG pattern (data: URL) counts as none. */
export function uploadedCourseImage(url: string | null | undefined) {
  return url && !url.startsWith("data:") ? url : null;
}

/** Two-letter monogram from the first two words ("Toán Cao Cấp" → "TC"). */
export function monogram(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";
}

/* ---------------- Search ---------------- */

/** Searchable text of a course (foldSearch): full name, short name and class/slot. */
export function courseSearchText(c: TimelineCourse, details?: CourseDetails) {
  return foldSearch([c.fullname, c.shortname, courseCategory(c, details)].join(" "));
}
