"use client";
import { useEffect, useState } from "react";
import { moodleClient } from "@/lib/client-api";
import type { SubmissionStatus } from "@/lib/moodle/types";

export type GradingSummary = NonNullable<SubmissionStatus["gradingsummary"]>;

const PARALLEL = 4;
const EMPTY = new Map<number, GradingSummary | null>();

/**
 * Grader summary (participants, submitted, needs grading) per assignment, from
 * mod_assign_get_submission_status without a userid. Moodle has no batch call,
 * so a few requests run in parallel and rows fill in as they arrive. A missing
 * key = still loading; null = unavailable.
 */
export function useGradingSummaries(assignids: number[]) {
  const key = assignids.join(",");
  const [state, setState] = useState<{ key: string; byId: Map<number, GradingSummary | null> }>({
    key: "",
    byId: EMPTY,
  });

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const queue = key.split(",").map(Number);
    const worker = async () => {
      for (let id = queue.shift(); id !== undefined && !cancelled; id = queue.shift()) {
        const summary = await moodleClient<SubmissionStatus>("mod_assign_get_submission_status", { assignid: id })
          .then((s) => s.gradingsummary ?? null)
          .catch(() => null);
        if (cancelled) return;
        setState((prev) => ({ key, byId: new Map(prev.key === key ? prev.byId : EMPTY).set(id, summary) }));
      }
    };
    for (let i = 0; i < PARALLEL; i++) void worker();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return state.key === key ? state.byId : EMPTY;
}
