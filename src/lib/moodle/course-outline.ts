import type { CourseModule, CourseSection } from "@/lib/moodle/types";

/**
 * Helpers for core_course_get_contents results that keep the portal correct
 * across Moodle versions (4.1 → 5.x):
 * - 4.4+ reports overall completion explicitly (isoverallcomplete);
 * - 4.5+ subsections (mod_subsection) come back twice: as a module row with
 *   modname "subsection" and as an extra "delegated" section at the end;
 * - 5.0.x+ question banks are course modules that must not be displayed.
 */

/** False for modules Moodle says not to show on the course page. */
function isDisplayable(mod: CourseModule): boolean {
  return mod.candisplay !== false && mod.modname !== "qbank";
}

/**
 * Modules that count towards the user's progress: every module with completion
 * enabled, labels included (as completion/classes/progress.php counts them),
 * and only when Moodle tracks this user (teachers/admins get completion data
 * with istrackeduser=false and must not see 0/N).
 */
export function isTracked(mod: CourseModule): boolean {
  return mod.modname !== "subsection" && !!mod.completiondata && mod.completiondata.istrackeduser !== false;
}

/** Available, but hidden from the course page ("stealth"); only staff see it listed there. */
export function isStealth(mod: CourseModule): boolean {
  return mod.visibleoncoursepage === 0 && mod.visible !== 0;
}

/**
 * Contents as Moodle's course page lists them: stealth modules are left out
 * unless `staff` (the portal's stand-in for moodle/course:viewhiddenactivities).
 */
export function forCoursePage(sections: CourseSection[], staff: boolean): CourseSection[] {
  if (staff) return sections;
  return sections.map((s) => ({ ...s, modules: s.modules.filter((m) => !isStealth(m)) }));
}

/**
 * Modules prev/next can lead to, as in Moodle's activity navigation
 * (core_course_renderer activity_navigation): something with a page the user
 * may open, not stealth, and no label or subsection row.
 */
export function isNavigable(mod: CourseModule): boolean {
  return (
    !!mod.url &&
    mod.uservisible !== false &&
    !isStealth(mod) &&
    mod.modname !== "label" &&
    mod.modname !== "subsection"
  );
}

/**
 * Portal page of a course module. SCORM has its own player (the course id,
 * when known, saves it a core_course_get_course_module call); everything else
 * goes through /activity, which redirects assignments, labels and subsections
 * and renders the rest.
 */
export function moduleRoute(mod: Pick<CourseModule, "id" | "modname">, courseId?: number | null): string {
  if (mod.modname !== "scorm") return `/activity/${mod.id}`;
  return courseId ? `/scorm/${mod.id}?course=${courseId}` : `/scorm/${mod.id}`;
}

/** Complete as Moodle counts it: isoverallcomplete (4.4+), else complete or complete-pass. */
export function isModuleDone(mod: CourseModule): boolean {
  const c = mod.completiondata;
  if (!c) return false;
  return c.isoverallcomplete ?? (c.state === 1 || c.state === 2);
}

/** Section id a "subsection" module row delegates to (4.5+), if any. */
function delegatedSectionId(mod: CourseModule): number | null {
  if (mod.modname !== "subsection" || !mod.customdata) return null;
  try {
    const id = (JSON.parse(mod.customdata) as { sectionid?: number | string }).sectionid;
    return id ? Number(id) : null;
  } catch {
    return null;
  }
}

export interface OutlineModule extends CourseModule {
  /** For a "subsection" row: the delegated section with its own modules. */
  subsection?: OutlineSection;
}

export interface OutlineSection extends Omit<CourseSection, "modules"> {
  modules: OutlineModule[];
}

/**
 * Top-level sections in course order. Delegated sections are attached to
 * their "subsection" module row instead of being listed again at the end;
 * hidden-from-course-page modules are dropped.
 */
export function buildOutline(sections: CourseSection[]): OutlineSection[] {
  const byId = new Map(sections.map((s) => [s.id, s]));
  const delegated = new Set(sections.filter((s) => s.component === "mod_subsection").map((s) => s.id));

  const toOutline = (section: CourseSection, depth: number): OutlineSection => ({
    ...section,
    modules: section.modules.filter(isDisplayable).map((mod) => {
      const target = delegatedSectionId(mod);
      const sub = target !== null && depth === 0 ? byId.get(target) : undefined;
      return sub ? { ...mod, subsection: toOutline(sub, depth + 1) } : mod;
    }),
  });

  return sections.filter((s) => !delegated.has(s.id)).map((s) => toOutline(s, 0));
}

/** Every module of the outline in reading order, subsection contents inlined (subsection rows excluded). */
export function flattenOutline(outline: OutlineSection[]): CourseModule[] {
  const out: CourseModule[] = [];
  const walk = (mods: OutlineModule[]) => {
    for (const mod of mods) {
      if (mod.subsection) walk(mod.subsection.modules);
      else if (mod.modname !== "subsection") out.push(mod);
    }
  };
  for (const section of outline) walk(section.modules);
  return out;
}

/**
 * Completed / tracked counts and percentage over the modules passed in (the
 * ones the user sees listed). Moodle's timeline progress also counts modules
 * hidden from the user, so the two can differ slightly.
 */
export function completionSummary(mods: CourseModule[]) {
  const tracked = mods.filter(isTracked);
  const done = tracked.filter(isModuleDone).length;
  return { done, total: tracked.length, percent: tracked.length ? Math.round((done / tracked.length) * 100) : null };
}
