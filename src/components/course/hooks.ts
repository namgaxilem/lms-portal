"use client";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { moodleCached, moodleClient } from "@/lib/client-api";
import type { CourseSection } from "@/lib/moodle/types";
import { withCompletion } from "./lib";

/**
 * Always a fresh read, stored in the shared cache entry the activity pages read
 * (course-navigation), so they start from the completion state shown here.
 */
const fetchContents = (courseid: number) =>
  moodleCached<CourseSection[]>("core_course_get_contents", { courseid }, 60_000, { refresh: true });

function without(states: Record<number, boolean>, cmid: number) {
  const next = { ...states };
  delete next[cmid];
  return next;
}

/**
 * Course contents, fetched fresh on every mount so completion is current after
 * returning from an activity. `setCompletion` toggles a manual completion
 * optimistically, then refetches; a failed refetch keeps the visible content.
 */
export function useCourseContents(courseid: number | null) {
  const [state, setState] = useState<{ id: number | null; data: CourseSection[] | null; error: string | null }>({
    id: null,
    data: null,
    error: null,
  });
  const [pending, setPending] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!courseid) return;
    let cancelled = false;
    fetchContents(courseid).then(
      (data) => !cancelled && setState({ id: courseid, data, error: null }),
      (e: Error) => !cancelled && setState({ id: courseid, data: null, error: e.message })
    );
    return () => {
      cancelled = true;
    };
  }, [courseid]);

  const current = courseid !== null && state.id === courseid;
  const raw = current ? state.data : null;
  const sections = useMemo(() => (raw ? withCompletion(raw, pending) : null), [raw, pending]);

  /** Rejects when Moodle refuses the change (the optimistic state is rolled back). */
  const setCompletion = useCallback(
    async (cmid: number, completed: boolean) => {
      if (!courseid) return;
      setPending((p) => ({ ...p, [cmid]: completed }));
      try {
        await moodleClient("core_completion_update_activity_completion_status_manually", { cmid, completed });
      } catch (e) {
        setPending((p) => without(p, cmid));
        throw e;
      }
      try {
        const data = await fetchContents(courseid);
        setState({ id: courseid, data, error: null });
      } catch {
        // Saved in Moodle but the refetch failed: keep the change locally.
        setState((s) => (s.id === courseid && s.data ? { ...s, data: withCompletion(s.data, { [cmid]: completed }) } : s));
      }
      setPending((p) => without(p, cmid));
    },
    [courseid]
  );

  return {
    sections,
    loading: courseid !== null && !current,
    error: current ? state.error : null,
    setCompletion,
  };
}

const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

/**
 * Section targeted by the URL hash: `#sec-{sectionid}` (portal anchors) or
 * Moodle's `#section-{number}`. Null when the hash names no section.
 */
export function useHashSection(sections: CourseSection[] | null): { key: string; id: number | null } | null {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
  const byId = /^#sec-(\d+)$/.exec(hash);
  if (byId) return { key: hash, id: Number(byId[1]) };
  const byNumber = /^#section-(\d+)$/.exec(hash);
  if (!byNumber) return null;
  return { key: hash, id: sections?.find((s) => s.section === Number(byNumber[1]))?.id ?? null };
}

/** Open / collapsed state of (sub)sections: the user's choice wins, else the caller's fallback. */
export function useExpansion() {
  const [chosen, setChosen] = useState<Record<number, boolean>>({});
  const isOpen = useCallback((id: number, fallback: boolean) => chosen[id] ?? fallback, [chosen]);
  const setOpen = useCallback((id: number, open: boolean) => setChosen((c) => ({ ...c, [id]: open })), []);
  const setAll = useCallback(
    (ids: number[], open: boolean) => setChosen(Object.fromEntries(ids.map((id) => [id, open]))),
    []
  );
  return { isOpen, setOpen, setAll };
}

/**
 * Scrolls a section into view (no smooth scrolling when reduced motion is
 * requested). With `focus`, keyboard focus moves to the section's header button
 * so keyboard and screen-reader users land where the page scrolled to.
 */
export function scrollToSection(id: number, { focus = false } = {}) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  if (focus) document.getElementById(`sec-${id}-title`)?.querySelector("button")?.focus({ preventScroll: true });
}
