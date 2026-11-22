"use client";
import { CalendarX2 } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Badge, EmptyState } from "@/components/ui";
import type { CalendarMonthView } from "@/lib/moodle/types";
import { EventRow } from "./EventParts";
import { dayHeading } from "./lib";
import type { CalendarSelection } from "./EventDialog";

/** Phone layout of a month: only the days that have events, as an agenda. */
export function MonthAgenda({
  view,
  onSelect,
}: {
  view: CalendarMonthView;
  onSelect: (s: CalendarSelection) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const days = view.weeks.flatMap((w) => w.days).filter((d) => d.events.length > 0);

  if (days.length === 0) {
    return <EmptyState compact icon={CalendarX2} title={t("calendar.noEventsMonth")} />;
  }
  return (
    <ol className="space-y-4">
      {days.map((day) => (
        <li key={day.timestamp}>
          <h3 className="mb-1 flex items-center gap-2 px-2.5 text-[13px] font-bold text-muted">
            {dayHeading(day.timestamp, locale)}
            {day.istoday && (
              <Badge tone="primary" size="sm">
                {t("common.today")}
              </Badge>
            )}
          </h3>
          <ul className="space-y-0.5">
            {day.events.map((e) => (
              <li key={e.id}>
                <EventRow event={e} onSelect={(event) => onSelect({ type: "event", event })} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
