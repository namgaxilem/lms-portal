import type { Tone } from "@/components/ui";
import { formatDate, hasRichContent, intlLocale, isToday, timeAgo } from "@/lib/format";
import { fileKind, formatFileSize, type FileKind } from "@/lib/moodle/files";
import {
  completionSummary,
  flattenOutline,
  isModuleDone,
  isNavigable,
  isTracked,
  moduleRoute,
  type OutlineSection,
} from "@/lib/moodle/course-outline";
import { eventDateKind, isPastDeadline, moduleDateKind, type DateKind } from "@/lib/moodle/dates";
import { portalRouteForMoodleUrl } from "@/lib/moodle/links";
import type { CalendarEvent, CourseDetails, CourseModule, CourseSection, EnrolledUser } from "@/lib/moodle/types";

/** core_enrol_get_users_courses item (only the fields used here). */
export interface UserCourse {
  id: number;
  enrolledusercount?: number;
}

/** Course image: `courseimage` (4.5+) or the first image among the overview files (4.1–4.4). */
export function courseImage(course: CourseDetails | undefined): string | null {
  if (!course) return null;
  return course.courseimage || course.overviewfiles?.find((f) => f.mimetype?.startsWith("image/"))?.fileurl || null;
}

/* ---------------- Modules ---------------- */

/**
 * Completion that only requires opening the activity ("completionview"). Then
 * "done" says nothing about the work: a quiz opened once still needs an attempt.
 * Manual completion has no rule details, so it never counts as view-only.
 */
function isViewOnlyCompletion(mod: CourseModule): boolean {
  const details = mod.completiondata?.details ?? [];
  return details.length > 0 && details.every((d) => d.rulename === "completionview");
}

/** Finished in a sense that goes beyond having opened the activity. */
export function isSettled(mod: CourseModule): boolean {
  return isTracked(mod) && isModuleDone(mod) && !isViewOnlyCompletion(mod);
}

/** Manual completion the user can toggle (completion tracking = manual). */
export function isManualCompletion(mod: CourseModule): boolean {
  return mod.completion === 1 && mod.uservisible !== false && isTracked(mod);
}

/** File format names are proper nouns, the same in every language. */
const FORMAT_NAME: Partial<Record<FileKind, string>> = {
  pdf: "PDF",
  word: "Word",
  spreadsheet: "Excel",
  presentation: "PowerPoint",
};

/** "PDF · 390 KB" for a file resource, from the module's contentsinfo and main file. */
export function fileSummary(mod: CourseModule, locale: string): string | null {
  const info = mod.contentsinfo;
  if (mod.modname !== "resource" || !info?.filessize) return null;
  const filename = mod.contents?.find((c) => c.type === "file")?.filename ?? "";
  const kind = fileKind({ filename, mimetype: info.mimetypes[0] });
  const extension = filename.includes(".") ? (filename.split(".").pop() ?? "").toUpperCase() : "";
  const format = FORMAT_NAME[kind] ?? (extension.length <= 4 ? extension : "");
  const size = formatFileSize(info.filessize, locale);
  return [format, size].filter(Boolean).join(" · ") || null;
}

/** Whole calendar days from `from` to `to` (local time, DST-safe). */
function calendarDays(from: number, to: number): number {
  const a = new Date(from * 1000);
  const b = new Date(to * 1000);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Relative time for use inside a sentence ("Closes {time}"): minutes and hours
 * under a day, then calendar days ("tomorrow" really means tomorrow), then the
 * date beyond 30 days. Lower-cased because Intl capitalizes some vi phrases.
 */
export function relativeTime(unix: number, now: number, locale: string): string {
  const diff = unix - now;
  let text: string;
  if (diff <= 0) text = timeAgo(unix, locale);
  else if (diff >= 30 * 86400) return formatDate(unix, locale);
  else {
    const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto", style: "short" });
    if (diff < 3600) text = rtf.format(Math.max(1, Math.round(diff / 60)), "minute");
    else if (diff < 86400) text = rtf.format(Math.floor(diff / 3600), "hour");
    else text = rtf.format(calendarDays(now, unix), "day");
  }
  return text.replace(/^\p{Lu}/u, (c) => c.toLocaleLowerCase(locale));
}

/* ---------------- Activity dates (module dates[]) ---------------- */

/** "Soon" = within three days. */
const SOON = 3 * 86400;

/** Urgency of a close / due date, the same in the rows and in the rail. */
export function deadlineTone(time: number, now: number): Tone {
  if (time - now < 86400 || isToday(time)) return "danger";
  if (time - now <= SOON) return "warning";
  return "accent";
}

/**
 * Where a module stands against its dates. `pastDue` only says the due date
 * has passed: whether the work is overdue comes from the calendar action
 * events, which disappear once it is submitted.
 */
export interface Timing {
  state: "notOpen" | "closing" | "closed" | "due" | "pastDue";
  time: number;
}

/** Where a module stands against its open / close / due dates at `now` (unix seconds). */
export function moduleTiming(mod: CourseModule, now: number): Timing | null {
  const dates = mod.dates ?? [];
  const first = (kind: DateKind) => dates.find((d) => d.timestamp > 0 && moduleDateKind(d.dataid) === kind);
  const open = first("open");
  if (open && open.timestamp > now) return { state: "notOpen", time: open.timestamp };
  const close = first("close");
  if (close) return { state: close.timestamp <= now ? "closed" : "closing", time: close.timestamp };
  const due = first("due");
  if (due) return { state: due.timestamp <= now ? "pastDue" : "due", time: due.timestamp };
  return null;
}

/** Navigable and inside its open window. */
function isActionable(mod: CourseModule, now: number): boolean {
  const state = moduleTiming(mod, now)?.state;
  return isNavigable(mod) && state !== "notOpen" && state !== "closed";
}

/** Course module ids with a passed close / due date that the calendar still lists as to do. */
export function overdueCmids(events: CalendarEvent[], now: number): Set<number> {
  return new Set(
    events.flatMap((e) => (e.instance && isPastDeadline(eventDateKind(e.eventtype), e.timesort, now) ? [e.instance] : []))
  );
}

/* ---------------- Resume ("Học tiếp") ---------------- */

export interface ResumeTarget {
  mod: CourseModule;
  /** start = nothing done yet; continue = in progress; review = everything tracked is done. */
  kind: "start" | "continue" | "review";
}

/**
 * Where "Continue" should lead, from the modules in reading order:
 * the most recently opened module when it is still unfinished, else the first
 * unfinished module after the last completed one (open ones first). Without
 * completion tracking: the most recently opened module, else the first one.
 */
export function findResumeTarget(mods: CourseModule[], recentCmids: number[], now: number): ResumeTarget | null {
  const nav = mods.filter(isNavigable);
  if (!nav.length) return null;
  const byId = new Map(nav.map((m) => [m.id, m]));
  const recent = recentCmids.map((id) => byId.get(id)).find((m) => m !== undefined);
  const tracked = nav.filter(isTracked);
  const incomplete = (m: CourseModule) => isTracked(m) && !isModuleDone(m);

  if (!tracked.length) return { mod: recent ?? nav[0], kind: recent ? "continue" : "start" };
  if (recent && incomplete(recent) && isActionable(recent, now)) return { mod: recent, kind: "continue" };

  let lastDone = -1;
  nav.forEach((m, i) => {
    if (isTracked(m) && isModuleDone(m)) lastDone = i;
  });
  const pick = (test: (m: CourseModule) => boolean) => nav.slice(lastDone + 1).find(test) ?? nav.find(test);
  const next = pick((m) => incomplete(m) && isActionable(m, now)) ?? pick(incomplete);
  if (next) return { mod: next, kind: lastDone >= 0 || recent ? "continue" : "start" };
  return { mod: recent ?? nav[0], kind: "review" };
}

/* ---------------- Sections ---------------- */

/** Completion of a section (subsection contents included) for the signed-in user. */
export function sectionProgress(section: OutlineSection) {
  return completionSummary(flattenOutline([section]));
}

/** Sections worth showing: with modules, a summary, or restriction info. */
export function isShownSection(section: OutlineSection): boolean {
  return section.modules.length > 0 || hasRichContent(section.summary) || hasRichContent(section.availabilityinfo);
}

/** Map of every (sub)section id to its top-level section id. */
export function topLevelIds(outline: OutlineSection[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const section of outline) {
    map.set(section.id, section.id);
    for (const mod of section.modules) if (mod.subsection) map.set(mod.subsection.id, section.id);
  }
  return map;
}

/** Top-level section holding module `cmid` (directly or in a subsection). */
export function sectionOfModule(outline: OutlineSection[], cmid: number): number | null {
  for (const section of outline) {
    if (flattenOutline([section]).some((m) => m.id === cmid)) return section.id;
  }
  return null;
}

/** Copy of the contents with the given manual completion states applied (optimistic UI). */
export function withCompletion(sections: CourseSection[], states: Record<number, boolean>): CourseSection[] {
  if (!Object.keys(states).length) return sections;
  return sections.map((section) => ({
    ...section,
    modules: section.modules.map((mod) => {
      const done = states[mod.id];
      if (done === undefined || !mod.completiondata) return mod;
      return { ...mod, completiondata: { ...mod.completiondata, state: done ? 1 : 0, isoverallcomplete: done } };
    }),
  }));
}

/* ---------------- Upcoming dates ---------------- */

export interface UpcomingItem {
  key: string;
  time: number;
  kind: DateKind;
  /** Activity name. */
  name: string;
  /** Moodle's own (already localized) label, used for kinds the portal does not name. */
  label: string;
  href: string | null;
  overdue: boolean;
}

/**
 * Upcoming open / close / due dates of the course, soonest first. Module dates
 * never disappear (calendar action events vanish once an activity counts as
 * complete); action events add what modules do not carry and overdue items.
 * A module and its events are matched by course module id.
 */
export function upcomingDates(
  mods: CourseModule[],
  events: CalendarEvent[],
  { now, courseId, horizonDays = 60 }: { now: number; courseId: number; horizonDays?: number }
): UpcomingItem[] {
  const until = now + horizonDays * 86400;
  const items = new Map<string, UpcomingItem>();
  for (const mod of mods) {
    for (const date of mod.dates ?? []) {
      if (date.timestamp < now || date.timestamp > until) continue;
      const key = `${mod.id}:${date.timestamp}`;
      items.set(key, {
        key,
        time: date.timestamp,
        kind: moduleDateKind(date.dataid),
        name: mod.name,
        label: date.label,
        href: isNavigable(mod) ? moduleRoute(mod, courseId) : null,
        overdue: false,
      });
    }
  }
  for (const event of events) {
    const kind = eventDateKind(event.eventtype);
    const overdue = isPastDeadline(kind, event.timesort, now);
    if ((event.timesort < now && !overdue) || event.timesort > until) continue;
    const key = `${event.instance ?? `event${event.id}`}:${event.timesort}`;
    if (items.has(key)) continue;
    items.set(key, {
      key,
      time: event.timesort,
      kind,
      name: event.activityname || event.name,
      label: event.name,
      href:
        event.modulename && event.instance
          ? moduleRoute({ id: event.instance, modname: event.modulename }, courseId)
          : portalRouteForMoodleUrl(event.url),
      overdue,
    });
  }
  return [...items.values()].sort((a, b) => a.time - b.time);
}

/* ---------------- People ---------------- */

const STAFF_ROLES = new Set(["manager", "coursecreator", "editingteacher", "teacher"]);

export function isStaffMember(member: EnrolledUser): boolean {
  return !!member.roles?.some((r) => STAFF_ROLES.has(r.shortname));
}
