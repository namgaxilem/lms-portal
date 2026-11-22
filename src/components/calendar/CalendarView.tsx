"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Button, Card, PageHeader, QueryState, Skeleton } from "@/components/ui";
import { courseStyle } from "@/lib/course-color";
import { useCalendarMonth, type YearMonth } from "@/lib/moodle/hooks";
import type { CalendarMonthView } from "@/lib/moodle/types";
import { EventDialog, type CalendarSelection } from "./EventDialog";
import { MonthAgenda } from "./MonthAgenda";
import { MonthGrid } from "./MonthGrid";
import { UpcomingList } from "./UpcomingList";
import { monthLabel, monthParam, shiftMonth } from "./lib";

const calendarHref = (m: YearMonth) => `/calendar?month=${monthParam(m)}`;

function MonthNav({ month, isCurrent }: { month: YearMonth; isCurrent: boolean }) {
  const t = useT();
  return (
    <nav aria-label={t("calendar.monthNav")} className="flex items-center gap-2">
      <Button href={calendarHref(shiftMonth(month, -1))} variant="secondary" size="icon" aria-label={t("calendar.prevMonth")}>
        <ChevronLeft size={18} />
      </Button>
      <Button href={calendarHref(shiftMonth(month, 1))} variant="secondary" size="icon" aria-label={t("calendar.nextMonth")}>
        <ChevronRight size={18} />
      </Button>
      <Button href="/calendar" variant="secondary" disabled={isCurrent}>
        {t("common.today")}
      </Button>
    </nav>
  );
}

/** Courses with events this month, as a colour legend for the grid. */
function CourseLegend({ view }: { view: CalendarMonthView }) {
  const courses = new Map<number, string>();
  for (const day of view.weeks.flatMap((w) => w.days)) {
    for (const e of day.events) if (e.course) courses.set(e.course.id, e.course.shortname || e.course.fullname);
  }
  if (courses.size === 0) return null;
  return (
    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4">
      {[...courses].map(([id, name]) => (
        <li key={id} style={courseStyle(id)} className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-course" />
          {name}
        </li>
      ))}
    </ul>
  );
}

function GridSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-5 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}

/**
 * Events of one month: a grid from md up, an agenda on phones. Mount it with
 * `key={monthParam(month)}` so a slow response for a month the user already
 * left can never show under another month's heading.
 */
function MonthPanel({
  month,
  label,
  onSelect,
}: {
  month: YearMonth;
  label: string;
  onSelect: (s: CalendarSelection) => void;
}) {
  const { data, loading, error } = useCalendarMonth(month);
  return (
    <QueryState loading={loading} error={error} skeleton={<GridSkeleton />}>
      {data && (
        <>
          <div className="hidden md:block">
            <MonthGrid view={data} label={label} onSelect={onSelect} />
            <CourseLegend view={data} />
          </div>
          <div className="md:hidden">
            <MonthAgenda view={data} onSelect={onSelect} />
          </div>
        </>
      )}
    </QueryState>
  );
}

/**
 * /calendar: the month (core_calendar_get_calendar_monthly_view) as a grid on
 * larger screens and an agenda on phones, plus "Upcoming"
 * (core_calendar_get_calendar_upcoming_view). Both list every calendar event
 * of the user's courses, unlike action events which vanish once completed.
 */
export function CalendarView({ month, isCurrent }: { month: YearMonth; isCurrent: boolean }) {
  const t = useT();
  const { locale } = useLocale();
  const [selection, setSelection] = useState<CalendarSelection | null>(null);
  const label = monthLabel(month, locale);

  return (
    <div>
      <PageHeader title={t("nav.calendar")} description={t("calendar.subtitle")} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Phones show Upcoming first, tablets and up after the month; one copy
            is display:none, so DOM, focus and visual order always agree (the
            two copies share one cached request). */}
        <div className="md:hidden">
          <UpcomingList onSelect={setSelection} />
        </div>

        <Card className="min-w-0 p-4 animate-fade-in-up sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold tracking-tight text-fg" aria-live="polite">
              {label}
            </h2>
            <MonthNav month={month} isCurrent={isCurrent} />
          </div>
          <MonthPanel key={monthParam(month)} month={month} label={label} onSelect={setSelection} />
        </Card>

        <div className="hidden md:block">
          <UpcomingList onSelect={setSelection} />
        </div>
      </div>

      <EventDialog selection={selection} onChange={setSelection} />
    </div>
  );
}
