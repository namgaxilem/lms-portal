"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { useLocale } from "@/i18n/I18nProvider";
import { MoodleRequestError, moodleCached, moodleClient, useMoodle } from "@/lib/client-api";
import { useEnrolledCourses } from "@/lib/moodle/hooks";
import { accountRole, isStaffRole } from "@/lib/format";
import { normaliseGradeItem, type GradeRow } from "@/components/grades/lib";
import type { ActivitiesCompletionResult, EnrolledUser, UserGrades } from "@/lib/moodle/types";
import { summariseCompletion } from "./completion";
import type { LearnerCompletion } from "./types";

const MIN = 60_000;

/** Above this many learners the per-learner progress and class grades are not loaded. */
export const MAX_DETAIL_LEARNERS = 300;

/** Parallel completion requests while loading a class. */
const CONCURRENCY = 4;

/* ---------------- Which view a course gets ---------------- */

/** The answer of the access check: the learner view, or the class report with its learners. */
type CheckedView = { kind: "student" } | { kind: "staff"; learnerIds: number[] };

type CourseView =
  | CheckedView
  | { kind: "loading" }
  /** The check failed for a reason that says nothing about permissions. */
  | { kind: "error"; error: string; retry: () => void };

const LOADING: CourseView = { kind: "loading" };
const STUDENT: CheckedView = { kind: "student" };

/*
 * Asking Moodle for "users with moodle/course:isincompletionreports" needs
 * moodle/role:review in the course (teachers, managers, admins — also via a
 * category or site role). So the answer decides the view per course, and when
 * it succeeds it is exactly the list of learners whose progress is tracked.
 */
const LEARNER_QUERY = [
  { name: "withcapability", value: "moodle/course:isincompletionreports" },
  { name: "userfields", value: "id" },
];

/* Moodle refusals: require_capability (required_capability_exception) and no access to the course context. */
const REFUSAL_CODES = new Set(["nopermissions", "errorcoursecontextnotvalid"]);

/** True when a failed check says nothing about permissions: network, proxy or server failure. */
function isOutage(e: unknown): boolean {
  return !(e instanceof MoodleRequestError && !!e.errorcode && REFUSAL_CODES.has(e.errorcode));
}

/** Per-course answers, refusals included, so switching back to a course skips the call. */
const viewCache = new Map<number, { at: number; promise: Promise<CheckedView> }>();

function checkCourseView(courseid: number): Promise<CheckedView> {
  const hit = viewCache.get(courseid);
  if (hit && Date.now() - hit.at < 5 * MIN) return hit.promise;
  const promise = moodleClient<{ id: number }[]>("core_enrol_get_enrolled_users", {
    courseid,
    options: LEARNER_QUERY,
  }).then(
    (rows): CheckedView => ({ kind: "staff", learnerIds: rows.map((r) => r.id) }),
    (e: unknown) => {
      if (isOutage(e)) throw e;
      return STUDENT;
    }
  );
  viewCache.set(courseid, { at: Date.now(), promise });
  // Outages are not remembered: the next attempt asks again.
  promise.catch(() => {
    if (viewCache.get(courseid)?.promise === promise) viewCache.delete(courseid);
  });
  return promise;
}

/**
 * Staff view when the user can review roles in `courseid`, else the learner
 * view. Users who are learners in every course see their view straight away
 * (it switches only if the check says otherwise, e.g. for a category manager).
 * For everyone else an outage gives an error with a retry instead of a guess.
 */
export function useCourseView(courseid: number | undefined): CourseView {
  const { user } = useSession();
  const provisional = isStaffRole(accountRole(user)) ? LOADING : STUDENT;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; view: CheckedView } | { key: string; error: string } | null>(
    null
  );
  const key = `${courseid}:${attempt}`;
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (courseid === undefined) return;
    let cancelled = false;
    checkCourseView(courseid).then(
      (view) => {
        if (!cancelled) setResult({ key, view });
      },
      (e: Error) => {
        if (!cancelled) setResult({ key, error: e.message });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [courseid, key]);

  if (courseid === undefined || result?.key !== key) return provisional;
  if ("view" in result) return result.view;
  // A learner's own report shows its own request errors; staff must not be guessed into it.
  return provisional === STUDENT ? STUDENT : { kind: "error", error: result.error, retry };
}

/* ---------------- Course ---------------- */

/** The selected course from the user's enrolments (shared, cached list). */
export function useReportCourse(courseid: number) {
  const { courses, loading, error } = useEnrolledCourses("allincludinghidden");
  return { course: courses.find((c) => c.id === courseid), loading, error };
}

/* ---------------- Staff data ---------------- */

const PARTICIPANT_QUERY = [
  { name: "userfields", value: "id,fullname,email,roles,lastcourseaccess,profileimageurlsmall" },
  { name: "sortby", value: "siteorder" },
];

/** Everyone enrolled in the course, in the site's name order. Mount per course (key). */
export function useParticipants(courseid: number) {
  const r = useMoodle<EnrolledUser[]>("core_enrol_get_enrolled_users", { courseid, options: PARTICIPANT_QUERY });
  return { ...r, participants: r.data ?? [] };
}

/**
 * Completion of each learner, loaded a few at a time and shown as it arrives.
 * A failed or refused request maps to { status: "error" }.
 */
export function useLearnerProgress(courseid: number, userIds: number[]) {
  const key = userIds.length ? `${courseid}|${[...userIds].sort((a, b) => a - b).join(",")}` : null;
  const [state, setState] = useState<{ key: string | null; results: Map<number, LearnerCompletion> }>({
    key: null,
    results: new Map(),
  });

  useEffect(() => {
    if (!key) return;
    const [course, list] = key.split("|");
    const queue = list.split(",").map(Number);
    let cancelled = false;

    const worker = async () => {
      for (let userid = queue.shift(); userid !== undefined; userid = queue.shift()) {
        const value = await moodleCached<ActivitiesCompletionResult>(
          "core_completion_get_activities_completion_status",
          { courseid: Number(course), userid },
          5 * MIN
        ).then(summariseCompletion, (): LearnerCompletion => ({ status: "error" }));
        if (cancelled) return;
        setState((s) => {
          const results = new Map(s.key === key ? s.results : undefined);
          results.set(userid, value);
          return { key, results };
        });
      }
    };
    for (let i = 0; i < CONCURRENCY; i++) void worker();

    return () => {
      cancelled = true;
    };
  }, [key]);

  const results = useMemo(() => (state.key === key ? state.results : new Map<number, LearnerCompletion>()), [state, key]);
  return { results, complete: results.size >= userIds.length };
}

/**
 * Each learner's course total, from one gradereport call for the whole class
 * (needs moodle/grade:viewall). Null when unavailable — the column is hidden.
 */
export function useClassTotals(courseid: number, enabled: boolean) {
  const { locale } = useLocale();
  const r = useMoodle<UserGrades>(
    "gradereport_user_get_grade_items",
    { courseid, userid: 0 },
    !enabled,
    { cacheMs: MIN }
  );
  const totals = useMemo(() => {
    if (!r.data) return null;
    const map = new Map<number, GradeRow>();
    for (const u of r.data.usergrades ?? []) {
      const course = u.gradeitems.find((i) => i.itemtype === "course");
      if (course) map.set(u.userid, normaliseGradeItem(course, locale));
    }
    return [...map.values()].some((g) => g.display !== null) ? map : null;
  }, [r.data, locale]);
  return { totals, loading: r.loading };
}

/* ---------------- Learner data ---------------- */

/** The signed-in user's completion in the course (same cache entry as the learning streak). */
export function useOwnCompletion(courseid: number) {
  const { user } = useSession();
  const r = useMoodle<ActivitiesCompletionResult>(
    "core_completion_get_activities_completion_status",
    { courseid, userid: user.id },
    false,
    { cacheMs: 5 * MIN }
  );
  return { ...r, statuses: r.data?.statuses ?? [] };
}
