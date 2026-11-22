"use client";
import { useCallback, useEffect, useState } from "react";
import { MoodleRequestError, moodleClient } from "@/lib/client-api";
import type { CourseModuleInfo } from "@/lib/moodle/types";
import type { ActivityCm } from "./shared";

/** Moodle's refusals of a module: deleted (invalidrecord), hidden or unavailable, no access. */
const ACCESS_ERRORCODES = new Set(["invalidrecord", "invalidcoursemodule", "requireloginerror", "nopermissions"]);

/**
 * True when Moodle refused the module, which the page shows as "not found".
 * Everything else is an error with a retry: network failures, Moodle being
 * unreachable or in maintenance, a function the proxy does not allow.
 */
function isAccessRefusal(e: unknown): boolean {
  return e instanceof MoodleRequestError && !!e.errorcode && ACCESS_ERRORCODES.has(e.errorcode);
}

interface State {
  cmid: number | null;
  attempt: number;
  cm: ActivityCm | null;
  error: string | null;
}

/** core_course_get_course_module for `cmid` (null = skip), with access errors reported as not found. */
export function useCourseModule(cmid: number | null) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ cmid: null, attempt: 0, cm: null, error: null });

  useEffect(() => {
    if (cmid === null) return;
    let cancelled = false;
    moodleClient<CourseModuleInfo>("core_course_get_course_module", { cmid }).then(
      (res) => !cancelled && setState({ cmid, attempt, cm: res.cm ?? null, error: null }),
      (e: unknown) =>
        !cancelled &&
        setState({
          cmid,
          attempt,
          cm: null,
          error: isAccessRefusal(e) ? null : e instanceof Error ? e.message : String(e),
        })
    );
    return () => {
      cancelled = true;
    };
  }, [cmid, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // Only report the result of the current cmid and attempt.
  const current = cmid !== null && state.cmid === cmid && state.attempt === attempt;
  return {
    cm: current ? state.cm : null,
    error: current ? state.error : null,
    loading: cmid !== null && !current,
    notFound: current && !state.cm && !state.error,
    retry,
  };
}
