"use client";
import { CalendarCheck2 } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Card, CardHeader, EmptyState, QueryState, Skeleton } from "@/components/ui";
import { groupByDay, isToday, isTomorrow } from "@/lib/format";
import { useCalendarUpcoming } from "@/lib/moodle/hooks";
import { EventRow } from "./EventParts";
import { dayHeading } from "./lib";
import type { CalendarSelection } from "./EventDialog";

function groupLabel(ts: number, locale: string, t: (k: string) => string) {
  if (isToday(ts)) return t("common.today");
  if (isTomorrow(ts)) return t("calendar.tomorrow");
  return dayHeading(ts, locale);
}

function UpcomingSkeleton() {
  return (
    <div className="space-y-3 p-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-9 w-9 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * "Upcoming" from core_calendar_get_calendar_upcoming_view: every calendar
 * event (not only actionable ones) within the user's Moodle lookahead.
 */
export function UpcomingList({ onSelect }: { onSelect: (s: CalendarSelection) => void }) {
  const t = useT();
  const { locale } = useLocale();
  const { data, loading, error } = useCalendarUpcoming();
  const events = [...(data?.events ?? [])].sort((a, b) => a.timesort - b.timesort);

  return (
    <Card className="animate-fade-in-up">
      <CardHeader title={t("calendar.upcoming")} description={t("calendar.upcomingHint")} />
      <div className="p-3">
        <QueryState loading={loading} error={error} skeleton={<UpcomingSkeleton />}>
          {events.length === 0 ? (
            <EmptyState compact icon={CalendarCheck2} title={t("calendar.noUpcoming")} />
          ) : (
            <ol className="space-y-3">
              {groupByDay(events, (e) => e.timesort).map((g) => (
                <li key={g.key}>
                  <h3 className="px-2.5 pb-0.5 text-xs font-bold uppercase tracking-wide text-subtle">
                    {groupLabel(g.time, locale, t)}
                  </h3>
                  <ul>
                    {g.items.map((e) => (
                      <li key={e.id}>
                        <EventRow event={e} onSelect={(event) => onSelect({ type: "event", event })} />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </QueryState>
      </div>
    </Card>
  );
}
