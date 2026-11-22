"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { moodleCached, useMoodle } from "@/lib/client-api";
import { accountRole, isStaffRole } from "@/lib/format";
import {
  buildOutline,
  completionSummary,
  flattenOutline,
  forCoursePage,
  isModuleDone,
  isNavigable,
  isTracked,
  type OutlineModule,
  type OutlineSection,
} from "@/lib/moodle/course-outline";
import type { CourseModule, CourseSection } from "@/lib/moodle/types";

/** Course contents are shared by every reader on the page, and the next page, for a minute. */
const CONTENTS_CACHE_MS = 60_000;
/** completion = 2: Moodle completes the module from its rules (on HVTC mostly "on view"). */
const AUTOMATIC = 2;

export interface CourseNavigation {
  outline: OutlineSection[];
  /** Navigable modules in reading order (subsection contents inlined). */
  items: CourseModule[];
  /** Position of the current module in `items`, -1 when it isn't listed. */
  index: number;
  /** The current module's row in the course contents, null when it isn't there. */
  current: CourseModule | null;
  prev: CourseModule | null;
  next: CourseModule | null;
  /** Section (and subsection) names leading to the current module. */
  trail: string[];
  /**
   * Completion over the tracked modules the user sees listed, counted like the
   * course page does; null when nothing is tracked for this user.
   */
  progress: { done: number; total: number; percent: number } | null;
}

function trailTo(outline: OutlineSection[], cmid: number): string[] {
  const has = (mods: OutlineModule[]) => mods.some((m) => m.id === cmid);
  for (const section of outline) {
    if (has(section.modules)) return [section.name];
    const sub = section.modules.find((m) => m.subsection && has(m.subsection.modules))?.subsection;
    if (sub) return [section.name, sub.name];
  }
  return [];
}

/** `staff` see stealth modules listed, as on the course page; prev/next skip them for everyone. */
function buildNavigation(sections: CourseSection[], cmid: number, staff: boolean): CourseNavigation {
  const outline = buildOutline(forCoursePage(sections, staff));
  const all = flattenOutline(outline);
  const items = all.filter(isNavigable);
  const index = items.findIndex((m) => m.id === cmid);
  const summary = completionSummary(all);
  return {
    outline,
    items,
    index,
    // From the raw contents: a stealth module opened through a link is still the current one.
    current: sections.flatMap((s) => s.modules).find((m) => m.id === cmid) ?? null,
    prev: index > 0 ? items[index - 1] : null,
    next: index >= 0 && index < items.length - 1 ? items[index + 1] : null,
    trail: trailTo(outline, cmid),
    progress: summary.percent === null ? null : { done: summary.done, total: summary.total, percent: summary.percent },
  };
}

interface CourseNavigationState {
  /** Null while loading or when the course contents can't be read. */
  nav: CourseNavigation | null;
  /** True until the first contents arrive, so callers can reserve their space. */
  loading: boolean;
  /** Re-reads the contents after completion changed; keeps the current outline if that fails. */
  refresh: () => void;
}

function useNavigationData(courseId: number, cmid: number, skip: boolean): CourseNavigationState {
  const { data, loading } = useMoodle<CourseSection[]>(
    "core_course_get_contents",
    { courseid: courseId },
    skip || !(courseId > 0),
    { cacheMs: CONTENTS_CACHE_MS }
  );
  const staff = isStaffRole(accountRole(useSession().user));
  const nav = useMemo(() => (data ? buildNavigation(data, cmid, staff) : null), [data, cmid, staff]);

  const refresh = useCallback(() => {
    if (!(courseId > 0)) return;
    // Replaces the shared cache entry: the outline above (and the next activity)
    // pick up the new state; a failure keeps the current one.
    moodleCached<CourseSection[]>("core_course_get_contents", { courseid: courseId }, CONTENTS_CACHE_MS, {
      refresh: true,
    }).catch(() => {});
  }, [courseId]);

  return { nav, loading: !nav && loading, refresh };
}

interface SharedNavigation extends CourseNavigationState {
  courseId: number;
  cmid: number;
  viewLogged: () => void;
}

const CourseNavigationContext = createContext<SharedNavigation | null>(null);

/** Could logging a view have just completed this module? (tracked, automatic, not done yet) */
function mayCompleteOnView(mod: CourseModule | null): boolean {
  return !!mod && mod.completion === AUTOMATIC && isTracked(mod) && !isModuleDone(mod);
}

/**
 * One course outline for an activity page: the header, viewer, completion
 * toggle and navigation bar share a single core_course_get_contents read. When
 * the viewer's mod_*_view_* call may have completed the module, the outline is
 * read again so the drawer, the progress and the next activity agree with Moodle.
 */
export function CourseNavigationProvider({
  courseId,
  cmid,
  children,
}: {
  courseId: number;
  cmid: number;
  children: ReactNode;
}) {
  const { nav, loading, refresh } = useNavigationData(courseId, cmid, false);
  const [viewed, setViewed] = useState(false);
  const checked = useRef(false);
  const viewLogged = useCallback(() => setViewed(true), []);

  useEffect(() => {
    if (!viewed || !nav || checked.current) return;
    checked.current = true;
    if (mayCompleteOnView(nav.current)) refresh();
  }, [viewed, nav, refresh]);

  const value = useMemo(
    () => ({ nav, loading, refresh, courseId, cmid, viewLogged }),
    [nav, loading, refresh, courseId, cmid, viewLogged]
  );
  return <CourseNavigationContext value={value}>{children}</CourseNavigationContext>;
}

/**
 * Course outline around one module. Inside a CourseNavigationProvider for the
 * same module it reads the shared outline; elsewhere (e.g. the SCORM player) it
 * loads its own through the shared one-minute cache.
 */
export function useCourseNavigationState(courseId: number, cmid: number): CourseNavigationState {
  const shared = useContext(CourseNavigationContext);
  const match = shared && shared.courseId === courseId && shared.cmid === cmid ? shared : null;
  const own = useNavigationData(courseId, cmid, match !== null);
  return match ?? own;
}

/** Reports a logged view to the page's course outline (undefined outside a provider). */
export function useViewLoggedHandler(): (() => void) | undefined {
  return useContext(CourseNavigationContext)?.viewLogged;
}
