import type { RecentItem, TimelineCourse } from "@/lib/moodle/types";

/** Current time in unix seconds. */
export function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

/* ---------------- Progress & status ---------------- */

/**
 * Completion % of a course, or null when Moodle does not track it. Moodle 4.1
 * always sends a number (0 when there is no data) and reports the untracked
 * case with `hasprogress: false` — teachers are never tracked, and courses
 * without completion-tracked activities have no progress either.
 */
export function courseProgress(c: Pick<TimelineCourse, "progress" | "hasprogress">): number | null {
  if (!c.hasprogress) return null;
  return Math.max(0, Math.min(100, Math.round(c.progress ?? 0)));
}

export type CourseStatus = "inProgress" | "upcoming" | "completed" | "ended";

/**
 * Status in the spirit of Moodle's course_classify_for_timeline()
 * (course/lib.php): end date passed → ended, start date ahead → upcoming,
 * otherwise in progress. Moodle's "course complete" needs completion criteria
 * the portal cannot read, so "completed" means every tracked activity is done.
 * Moodle's grace periods (coursegraceperiodafter/before) are not exposed to web
 * services and are ignored. `now` is in unix seconds.
 */
export function courseStatus(c: TimelineCourse, now: number): CourseStatus {
  if (courseProgress(c) === 100) return "completed";
  if (c.enddate && c.enddate > 0 && c.enddate < now) return "ended";
  if (c.startdate && c.startdate > now) return "upcoming";
  return "inProgress";
}

/* ---------------- Last access ---------------- */

/**
 * Latest access per course (unix seconds). core_course_get_recent_courses skips
 * courses hidden from students and only moves when the course page is opened
 * (core_course_view_course), so recently opened activities
 * (block_recentlyaccesseditems, fed by mod_*_view_*) count too.
 */
export function lastAccessByCourse(recentCourses: TimelineCourse[], items: RecentItem[]) {
  const access = new Map<number, number>();
  for (const c of recentCourses) if (c.timeaccess) access.set(c.id, c.timeaccess);
  for (const i of items) access.set(i.courseid, Math.max(access.get(i.courseid) ?? 0, i.timeaccess));
  return access;
}

/** Courses, most recently accessed first (never-accessed ones keep their order, last). */
export function byLastAccess(courses: TimelineCourse[], access: Map<number, number>) {
  return [...courses].sort((a, b) => (access.get(b.id) ?? 0) - (access.get(a.id) ?? 0));
}

/* ---------------- Continue learning ---------------- */

export interface CourseResume {
  course: TimelineCourse;
  /** The activity to reopen; null = resume at the course page. */
  item: RecentItem | null;
}

/**
 * What "continue learning" opens (dashboard hero and the mobile button alike):
 * the most recently opened activity in an in-progress course, else the most
 * recently opened activity in any other course the user is enrolled in, else
 * the most recently accessed in-progress course that is not finished (an
 * untracked course counts as unfinished). `inProgress` must already be sorted
 * by last access (byLastAccess).
 */
export function resolveResume(
  items: RecentItem[],
  inProgress: TimelineCourse[],
  enrolled: TimelineCourse[]
): CourseResume | null {
  const current = new Map(inProgress.map((c) => [c.id, c] as const));
  // The timeline copy wins: it is the list the rest of the page shows.
  const known = new Map([...enrolled, ...inProgress].map((c) => [c.id, c] as const));
  for (const courses of [current, known]) {
    for (const item of items) {
      const course = courses.get(item.courseid);
      if (course) return { course, item };
    }
  }
  const course = inProgress.find((c) => (courseProgress(c) ?? 0) < 100);
  return course ? { course, item: null } : null;
}
