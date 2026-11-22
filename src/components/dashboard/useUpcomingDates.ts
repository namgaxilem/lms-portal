"use client";
import { useMemo } from "react";
import {
  useCalendarMonth,
  useCalendarUpcoming,
  useDeadlines,
  useSiteFunctions,
  type YearMonth,
} from "@/lib/moodle/hooks";
import { moduleRoute } from "@/lib/moodle/course-outline";
import { eventDateKind, isPastDeadline, type DateKind } from "@/lib/moodle/dates";
import { portalRouteForMoodleUrl } from "@/lib/moodle/links";
import type { CalendarEvent, CalendarMonthView } from "@/lib/moodle/types";

const DAY = 86400;
export const WEEK = 7 * DAY;
/** How far back an overdue to-do is still listed (the action-event window). */
const OVERDUE_DAYS = 14;
const UPCOMING_VIEW = "core_calendar_get_calendar_upcoming_view";
const MONTHLY_VIEW = "core_calendar_get_calendar_monthly_view";

export interface UpcomingDate {
  id: number;
  title: string;
  kind: DateKind;
  modname: string | null;
  /** Unix seconds. */
  time: number;
  course: { id: number; fullname: string; shortname: string } | null;
  /** Portal page for the event; null when the portal has none. */
  href: string | null;
  /** Moodle still lists it as an action event: something is left to do. */
  todo: boolean;
  /** The action exists but cannot be taken yet (e.g. the quiz is not open). */
  notOpenYet: boolean;
  /** A close/due date that passed while still to do. */
  overdue: boolean;
}

/** Event types that belong to no course (site events carry the front page as their course). */
const NO_COURSE = new Set(["site", "user"]);

function toDate(e: CalendarEvent, action: CalendarEvent | undefined, now: number): UpcomingDate {
  const kind = eventDateKind(e.eventtype);
  const course = e.course && !NO_COURSE.has(e.eventtype) ? e.course : null;
  // `instance` is the activity's course module id.
  const route =
    e.modulename && e.instance
      ? moduleRoute({ id: e.instance, modname: e.modulename }, course?.id)
      : (portalRouteForMoodleUrl(e.url) ??
        portalRouteForMoodleUrl(action?.action?.url) ??
        (course ? `/courses/${course.id}` : null));
  return {
    id: e.id,
    // Moodle's event name says what an unusual date is ("… (submissions deadline)");
    // open/close/due get the activity name plus the portal's own label.
    title: kind === "other" ? e.name : e.activityname || e.name,
    kind,
    modname: e.modulename || null,
    time: e.timesort,
    course,
    // Site events link to the front page, which is this dashboard.
    href: route === "/dashboard" ? null : route,
    todo: !!action,
    notOpenYet: action?.action?.actionable === false,
    overdue: !!action && isPastDeadline(kind, e.timesort, now),
  };
}

/**
 * Calendar events merged with action events, de-duplicated by id, oldest first.
 * A date that has passed stays only as a recent overdue to-do: an opening date
 * in the past is no longer coming up.
 */
function mergeDates(events: CalendarEvent[], actionEvents: CalendarEvent[], now: number) {
  const actionById = new Map(actionEvents.map((e) => [e.id, e]));
  const merged = new Map<number, UpcomingDate>();
  const add = (e: CalendarEvent, action: CalendarEvent | undefined) => {
    if (merged.has(e.id)) return;
    const date = toDate(e, action, now);
    if (date.time >= now || (date.overdue && date.time >= now - OVERDUE_DAYS * DAY)) merged.set(e.id, date);
  };
  for (const e of events) add(e, actionById.get(e.id) ?? (e.action ? e : undefined));
  for (const a of actionEvents) add(a, a);
  return [...merged.values()].sort((a, b) => a.time - b.time);
}

/**
 * Months the next 7 days fall in (browser time, padded by a day on both sides
 * because Moodle reads them in the user's own time zone): at most two.
 */
function weekMonths(now: number): [YearMonth, YearMonth | null] {
  const at = (unix: number) => {
    const d = new Date(unix * 1000);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  };
  const first = at(now - DAY);
  const last = at(now + WEEK + DAY);
  return [first, last.year === first.year && last.month === first.month ? null : last];
}

const monthEvents = (view: CalendarMonthView | null) =>
  view?.weeks.flatMap((w) => w.days.flatMap((d) => d.events)) ?? [];

/**
 * Upcoming open/close/due dates, oldest first. Moodle drops an ACTION event as
 * soon as its activity counts as complete (on HVTC most activities complete on
 * view, quizzes also after a finished attempt), so dates come from the upcoming
 * calendar view, which keeps them; action events add overdue items and mark
 * what is still to do. The view stops at the user's look-ahead and event limit,
 * so when it does not reach past the next 7 days, that week is read from the
 * month view, which has no limit, to keep the 7-day count exact.
 */
export function useUpcomingDates() {
  const site = useSiteFunctions();
  const has = (fn: string) => (site.error ? false : site.has(fn));
  const canView = has(UPCOMING_VIEW);
  const canMonth = has(MONTHLY_VIEW);
  const view = useCalendarUpcoming(canView !== true);
  // Wider than the default look-ahead so "to do" covers what the view lists; 50 is Moodle's maximum.
  const actions = useDeadlines({ daysBack: OVERDUE_DAYS, daysAhead: 30, limit: 50 });
  const { now } = actions;

  const viewSettled = canView === false || !!view.data || !!view.error;
  const viewCoversWeek = !!view.data?.events.some((e) => e.timesort > now + WEEK);
  const needMonths = canMonth === true && viewSettled && !viewCoversWeek;
  const [firstMonth, nextMonth] = weekMonths(now);
  const month1 = useCalendarMonth(firstMonth, !needMonths);
  const month2 = useCalendarMonth(nextMonth ?? firstMonth, !needMonths || !nextMonth);

  const dates = useMemo(
    () => mergeDates([...(view.data?.events ?? []), ...monthEvents(month1.data), ...monthEvents(month2.data)], actions.events, now),
    [view.data, month1.data, month2.data, actions.events, now]
  );

  const settled = (r: { data: unknown; error: string | null }) => !!r.data || !!r.error;
  const monthsPending = needMonths && (!settled(month1) || (!!nextMonth && !settled(month2)));
  const calendarRead = !!view.data || !!month1.data;
  return {
    dates,
    now,
    loading: actions.loading || !viewSettled || monthsPending,
    error: actions.error && !calendarRead ? actions.error : null,
  };
}
