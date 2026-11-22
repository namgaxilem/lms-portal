import type { LucideIcon } from "lucide-react";
import { BookOpen, CalendarDays, FolderTree, Globe, User, Users } from "lucide-react";
import type { Tone } from "@/components/ui/Badge";
import { formatDate, formatDateTime, formatTime, intlLocale } from "@/lib/format";
import { moduleMeta } from "@/lib/module-meta";
import type { YearMonth } from "@/lib/moodle/hooks";
import { moduleRoute } from "@/lib/moodle/course-outline";
import type { CalendarEvent } from "@/lib/moodle/types";

/** "2026-11" → {year: 2026, month: 11}; null when absent or malformed (or a repeated ?month=). */
export function parseMonth(value: string | string[] | undefined): YearMonth | null {
  const m = typeof value === "string" ? value.match(/^(\d{4})-(\d{1,2})$/) : null;
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  return month >= 1 && month <= 12 && year >= 1970 && year <= 2100 ? { year, month } : null;
}

export function monthParam({ year, month }: YearMonth) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function currentMonth(): YearMonth {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

const capitalise = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

/** "Tháng 11 năm 2026" / "November 2026". */
export function monthLabel({ year, month }: YearMonth, locale: string) {
  return capitalise(
    new Date(year, month - 1, 1).toLocaleDateString(intlLocale(locale), { month: "long", year: "numeric" })
  );
}

/** Localised weekday name for Moodle's day number (0 = Sunday). */
export function weekdayName(dayno: number, locale: string, weekday: "short" | "long" = "short") {
  // 7 January 2024 was a Sunday.
  return capitalise(new Date(2024, 0, 7 + dayno).toLocaleDateString(intlLocale(locale), { weekday }));
}

/** "Thứ Bảy, 21 tháng 11" — the heading of one agenda day. */
export function dayHeading(timestamp: number, locale: string) {
  return capitalise(formatDate(timestamp, locale, { weekday: "long", day: "numeric", month: "long" }));
}

/** Time of an event: "14:00", "08:00 – 10:00", or a date range when it spans days. */
export function eventTime(event: CalendarEvent, locale: string) {
  const start = event.timestart;
  if (!event.timeduration) return formatTime(start, locale);
  const end = start + event.timeduration;
  const sameDay = new Date(start * 1000).toDateString() === new Date(end * 1000).toDateString();
  return sameDay
    ? `${formatTime(start, locale)} – ${formatTime(end, locale)}`
    : `${formatDateTime(start, locale)} – ${formatDateTime(end, locale)}`;
}

const TYPE_LOOK: Record<string, { icon: LucideIcon; tone: Tone }> = {
  site: { icon: Globe, tone: "primary" },
  user: { icon: User, tone: "violet" },
  group: { icon: Users, tone: "accent" },
  category: { icon: FolderTree, tone: "warning" },
  course: { icon: BookOpen, tone: "success" },
};

interface EventLook {
  icon: LucideIcon;
  /** i18n key of the event kind (activity type, or site/user/group… event). */
  labelKey: string;
  /** Course events take their course's colour (courseStyle); others use `tone`. */
  courseId: number | null;
  tone: Tone;
}

/** Icon and colour of an event: the activity type's icon in its course's colour. */
export function eventLook(event: CalendarEvent): EventLook {
  const type = TYPE_LOOK[event.normalisedeventtype];
  const meta = event.modulename ? moduleMeta(event.modulename) : null;
  return {
    icon: meta?.icon ?? type?.icon ?? CalendarDays,
    labelKey: meta?.labelKey ?? `calendar.type.${type ? event.normalisedeventtype : "other"}`,
    courseId: event.course?.id ?? null,
    tone: meta?.tone ?? type?.tone ?? "neutral",
  };
}

interface EventLink {
  href: string;
  /** What `href` opens, for the button label. */
  kind: "activity" | "course";
}

/**
 * Portal page of the event's activity (`instance` is its course module id),
 * else of its course; null for site and personal events.
 */
export function eventTarget(event: CalendarEvent): EventLink | null {
  if (event.modulename && event.instance) {
    return { href: moduleRoute({ id: event.instance, modname: event.modulename }, event.course?.id), kind: "activity" };
  }
  return event.course ? { href: `/courses/${event.course.id}`, kind: "course" } : null;
}
