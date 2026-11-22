"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { moodleCached, useMoodle } from "@/lib/client-api";
import { byLastAccess, lastAccessByCourse, resolveResume, type CourseResume } from "@/lib/courses";
import { computeLearningStats, type LearningStats } from "@/lib/learning";
import { moduleRoute } from "@/lib/moodle/course-outline";
import { loadScormProgress, type ScormProgress } from "@/lib/scorm/progress";
import type {
  ActivitiesCompletionResult,
  CalendarActionEventsResult,
  CalendarMonthView,
  CalendarUpcomingView,
  CoursesByFieldResult,
  ForumDiscussionsResult,
  ForumInfo,
  GradesOverviewResult,
  RecentItem,
  SiteInfo,
  TimelineCourse,
} from "@/lib/moodle/types";

const MIN = 60_000;

/**
 * Runs `load` once per `key` (null = skip) and keeps the result keyed, so a
 * result is never shown for another key. `load` may only use values encoded in
 * `key`. `reload()` runs it again for the current key and keeps the shown data
 * if that fails. State is only set asynchronously.
 */
export function useKeyedAsync<T>(key: string | null, load: () => Promise<T>) {
  const [state, setState] = useState<{ key: string | null; data: T | null; error: string | null }>({
    key: null,
    data: null,
    error: null,
  });
  // `load` is a fresh closure every render; `key` captures everything it uses.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, [key]);

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    run().then(
      (data) => !cancelled && setState({ key, data, error: null }),
      (e: Error) => !cancelled && setState({ key, data: null, error: e.message })
    );
    return () => {
      cancelled = true;
    };
  }, [key, run]);

  const reload = useCallback(async () => {
    if (key === null) return;
    try {
      const data = await run();
      setState((s) => (s.key === key ? { key, data, error: null } : s));
    } catch (e) {
      setState((s) => (s.key === key ? { ...s, error: (e as Error).message } : s));
    }
  }, [key, run]);

  const current = key !== null && state.key === key;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: key !== null && !current,
    reload,
  };
}

/* ---------------- Courses ---------------- */

/**
 * The user's enrolled courses for a timeline classification (shared for a minute).
 * Prefer "allincludinghidden" over "all": "all" drops courses the user hid in
 * Moodle's My courses block, and the portal has no way to unhide them.
 * `hasprogress` is false when Moodle tracks no completion (progress is then 0, not real).
 */
export function useEnrolledCourses(
  classification: "inprogress" | "all" | "allincludinghidden" | "future" | "past" = "inprogress"
) {
  const r = useMoodle<{ courses: TimelineCourse[] }>(
    "core_course_get_enrolled_courses_by_timeline_classification",
    { classification, limit: 0, offset: 0, sort: "fullname" },
    false,
    { cacheMs: MIN }
  );
  return { ...r, courses: r.data?.courses ?? [] };
}

/** Contacts (teachers), category (class/slot) and dates for a set of courses. */
export function useCourseDetails(ids: number[]) {
  const value = [...new Set(ids)].sort((a, b) => a - b).join(",");
  const r = useMoodle<CoursesByFieldResult>("core_course_get_courses_by_field", { field: "ids", value }, !value, {
    cacheMs: 5 * MIN,
  });
  const byId = useMemo(() => new Map((r.data?.courses ?? []).map((c) => [c.id, c])), [r.data]);
  return { ...r, byId };
}

/* ---------------- Recently opened & resume ---------------- */

export function useRecentItems(limit = 10) {
  const r = useMoodle<RecentItem[]>("block_recentlyaccesseditems_get_recent_items", { limit }, false, { cacheMs: MIN });
  return { ...r, items: r.data ?? [] };
}

/** Where "continue learning" leads: the activity to reopen, else the course page. */
export function resumeHref({ course, item }: CourseResume) {
  return item ? moduleRoute({ id: item.cmid, modname: item.modname }, item.courseid) : `/courses/${course.id}`;
}

/**
 * When the user last opened each course (unix seconds by id), from
 * core_course_get_recent_courses and the recently opened activities.
 * `recentCourses` is newest first.
 */
export function useCourseAccess() {
  const { user } = useSession();
  const courses = useMoodle<TimelineCourse[]>("core_course_get_recent_courses", { userid: user.id, limit: 20 }, false, {
    cacheMs: MIN,
  });
  const recent = useRecentItems();
  const access = useMemo(() => lastAccessByCourse(courses.data ?? [], recent.items), [courses.data, recent.items]);
  const { reload: reloadCourses } = courses;
  const { reload: reloadRecent } = recent;
  const reload = useCallback(() => {
    reloadCourses();
    reloadRecent();
  }, [reloadCourses, reloadRecent]);
  return {
    access,
    recentCourses: courses.data ?? [],
    recentItems: recent.items,
    loading: courses.loading || recent.loading,
    reload,
  };
}

/**
 * "Continue learning", the same for the dashboard hero and the mobile button:
 * in-progress courses by last access and the resume target (resolveResume).
 * `coursesError` is the in-progress list's error; `reload()` reads everything again.
 */
export function useContinueLearning() {
  const inProgress = useEnrolledCourses("inprogress");
  const enrolled = useEnrolledCourses("allincludinghidden");
  const { access, recentCourses, recentItems, loading: accessLoading, reload: reloadAccess } = useCourseAccess();
  const courses = useMemo(() => byLastAccess(inProgress.courses, access), [inProgress.courses, access]);
  const loading = inProgress.loading || enrolled.loading || accessLoading;
  const target = useMemo(
    () => (loading ? null : resolveResume(recentItems, courses, [...recentCourses, ...enrolled.courses])),
    [loading, recentItems, courses, recentCourses, enrolled.courses]
  );
  const { reload: reloadInProgress } = inProgress;
  const { reload: reloadEnrolled } = enrolled;
  const reload = useCallback(() => {
    reloadInProgress();
    reloadEnrolled();
    reloadAccess();
  }, [reloadInProgress, reloadEnrolled, reloadAccess]);
  return {
    target,
    loading,
    courses,
    access,
    coursesLoading: inProgress.loading || accessLoading,
    coursesError: inProgress.error,
    reload,
  };
}

/* ---------------- Deadlines (calendar action events) ---------------- */

/**
 * Activity open/close/due events from `daysBack` to `daysAhead` days around now,
 * oldest first. On Moodle these are action events (quiz/SCORM open & close,
 * assignment due…) the user can still act on.
 */
export function useDeadlines({ daysBack = 14, daysAhead = 14, limit = 20 } = {}) {
  // Rounded to the minute so the cache key is stable across renders.
  const [now] = useState(() => Math.floor(Date.now() / MIN) * 60);
  const r = useMoodle<CalendarActionEventsResult>(
    "core_calendar_get_action_events_by_timesort",
    { timesortfrom: now - daysBack * 86400, timesortto: now + daysAhead * 86400, limitnum: limit, limittononsuspendedevents: true },
    false,
    { cacheMs: MIN }
  );
  const events = useMemo(() => [...(r.data?.events ?? [])].sort((a, b) => a.timesort - b.timesort), [r.data]);
  return { ...r, events, now };
}

/** Upcoming action events of one course. */
export function useCourseDeadlines(courseid: number, { daysAhead = 60, limit = 10 } = {}) {
  const [now] = useState(() => Math.floor(Date.now() / MIN) * 60);
  const r = useMoodle<CalendarActionEventsResult>(
    "core_calendar_get_action_events_by_course",
    { courseid, timesortfrom: now - 14 * 86400, timesortto: now + daysAhead * 86400, limitnum: limit },
    !courseid,
    { cacheMs: MIN }
  );
  return { ...r, events: r.data?.events ?? [], now };
}

/* ---------------- Calendar views (every event, not only action events) ---------------- */

export interface YearMonth {
  year: number;
  /** 1–12. */
  month: number;
}

/**
 * core_calendar_get_calendar_upcoming_view: every event the user can see from
 * the current hour, up to their Moodle look-ahead and event limit. Shared for
 * a minute by the dashboard, /grades and /calendar.
 */
export function useCalendarUpcoming(skip = false) {
  return useMoodle<CalendarUpcomingView>("core_calendar_get_calendar_upcoming_view", {}, skip, { cacheMs: MIN });
}

/** core_calendar_get_calendar_monthly_view for one month (no event limit), shared like the upcoming view. */
export function useCalendarMonth({ year, month }: YearMonth, skip = false) {
  return useMoodle<CalendarMonthView>(
    "core_calendar_get_calendar_monthly_view",
    { year, month, day: 1, includenavigation: false, mini: false },
    skip,
    { cacheMs: MIN }
  );
}

/* ---------------- Learning activity (completion timestamps) ---------------- */

/** Complete as Moodle counts it: isoverallcomplete (4.4+), else complete or complete-pass. */
const isCompleted = (s: ActivitiesCompletionResult["statuses"][number]) =>
  s.isoverallcomplete ?? (s.state === 1 || s.state === 2);

/** Completion requests in flight at once: a student may have dozens of enrolments. */
const COMPLETION_CONCURRENCY = 4;

/** Promise.allSettled over `items`, running at most `limit` at a time (results keep their order). */
async function allSettledLimited<I, R>(items: I[], limit: number, run: (item: I) => Promise<R>) {
  const results: PromiseSettledResult<R>[] = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await run(items[i]) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Streak, weekly counts and heatmap from the user's completions in `courseIds`.
 * A course whose request fails is skipped; if every request fails, `error` is set.
 */
function useLearningActivity(courseIds: number[]) {
  const { user } = useSession();
  const ids = [...new Set(courseIds)].sort((a, b) => a - b);
  const key = ids.length ? `${user.id}:${ids.join(",")}` : null;
  const r = useKeyedAsync<LearningStats>(key, async () => {
    const results = await allSettledLimited(ids, COMPLETION_CONCURRENCY, (courseid) =>
      moodleCached<ActivitiesCompletionResult>(
        "core_completion_get_activities_completion_status",
        { courseid, userid: user.id },
        5 * MIN
      )
    );
    const ok = results.flatMap((res) => (res.status === "fulfilled" ? [res.value] : []));
    if (!ok.length) throw (results[0] as PromiseRejectedResult).reason;
    const stamps = ok.flatMap((res) => res.statuses).filter(isCompleted).map((s) => s.timecompleted);
    return computeLearningStats(stamps);
  });
  return { ...r, stats: r.data };
}

/**
 * The user's learning activity over every enrolment where Moodle tracks their
 * completion — ended and hidden courses included, so all-time totals, streaks
 * and milestones are the same in the shell, dashboard, grades and profile.
 * `tracked` = those courses (progress is meaningful for them).
 */
export function useMyLearningActivity() {
  const enrolled = useEnrolledCourses("allincludinghidden");
  const tracked = useMemo(() => enrolled.courses.filter((c) => c.hasprogress === true), [enrolled.courses]);
  const activity = useLearningActivity(tracked.map((c) => c.id));
  // Retry what failed: the course list, else the completion requests (same key, so only reload() re-runs them).
  const { error: enrolledError, reload: reloadEnrolled } = enrolled;
  const { reload: reloadActivity } = activity;
  const reload = useCallback(() => {
    if (enrolledError) reloadEnrolled();
    else void reloadActivity();
  }, [enrolledError, reloadEnrolled, reloadActivity]);
  return {
    stats: activity.stats,
    tracked,
    loading: enrolled.loading || activity.loading,
    error: enrolled.error ?? activity.error,
    reload,
  };
}

/* ---------------- Announcements (course news forums) ---------------- */

export interface NewsItem {
  id: number;
  courseId: number;
  forumCmid: number;
  subject: string;
  /** HTML message of the first post. */
  message: string;
  author: string;
  authorPicture?: string;
  time: number;
  /** Pinned discussions come first in Moodle's lists, whatever their age. */
  pinned: boolean;
}

/** Latest announcements from the news forums of `courseIds`, newest first. */
export function useNewsFeed(courseIds: number[], { perForum = 3, limit = 6 } = {}) {
  const ids = [...new Set(courseIds)].sort((a, b) => a - b);
  const key = ids.length ? `news:${ids.join(",")}:${perForum}` : null;
  const r = useKeyedAsync<NewsItem[]>(key, async () => {
    const forums = await moodleCached<ForumInfo[]>("mod_forum_get_forums_by_courses", { courseids: ids }, 5 * MIN);
    const news = forums.filter((f) => f.type === "news");
    const lists = await Promise.all(
      news.map(async (f) => {
        const res = await moodleCached<ForumDiscussionsResult>(
          "mod_forum_get_forum_discussions",
          // 3 = newest discussions first (discussion_list::SORTORDER_CREATED_DESC)
          { forumid: f.id, sortorder: 3, page: 0, perpage: perForum },
          2 * MIN
        ).catch(() => ({ discussions: [] }));
        return res.discussions.map<NewsItem>((d) => ({
          id: d.discussion,
          courseId: f.course,
          forumCmid: f.cmid,
          subject: d.subject || d.name,
          message: d.message,
          author: d.userfullname,
          authorPicture: d.userpictureurl,
          time: d.created,
          pinned: !!d.pinned,
        }));
      })
    );
    return lists.flat().sort((a, b) => b.time - a.time).slice(0, limit);
  });
  return { ...r, items: r.data ?? [] };
}

/* ---------------- Grades ---------------- */

/** Course totals for every enrolled course (as configured in each gradebook). */
export function useGradesOverview() {
  const r = useMoodle<GradesOverviewResult>("gradereport_overview_get_course_grades", {}, false, { cacheMs: MIN });
  const byCourse = useMemo(() => new Map((r.data?.grades ?? []).map((g) => [g.courseid, g])), [r.data]);
  return { ...r, byCourse };
}

/* ---------------- SCORM progress ---------------- */

/** % learned and time spent in one SCORM activity (null: not started / unavailable). */
export function useScormProgress(cmid: number | null | undefined, courseid: number | null | undefined) {
  const { user } = useSession();
  const key = cmid && courseid ? `scorm:${user.id}:${courseid}:${cmid}` : null;
  const r = useKeyedAsync<ScormProgress | null>(key, () =>
    loadScormProgress(cmid!, courseid!, user.id).catch(() => null)
  );
  return { ...r, progress: r.data };
}

/* ---------------- Site capabilities ---------------- */

/**
 * Web service functions available to this token (site_info.functions), for
 * features that depend on the Moodle version — e.g. mod_assign_remove_submission
 * (Moodle 4.3+). `has()` is undefined while loading.
 */
export function useSiteFunctions() {
  const r = useMoodle<SiteInfo>("core_webservice_get_site_info", {}, false, { cacheMs: 30 * MIN });
  const names = useMemo(() => (r.data ? new Set(r.data.functions.map((f) => f.name)) : null), [r.data]);
  return { ...r, has: (fn: string) => (names ? names.has(fn) : undefined), release: r.data?.release };
}
