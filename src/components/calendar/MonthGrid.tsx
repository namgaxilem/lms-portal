"use client";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { cn } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { CalendarDay, CalendarMonthView } from "@/lib/moodle/types";
import { EventChip } from "./EventParts";
import { weekdayName } from "./lib";
import type { CalendarSelection } from "./EventDialog";

/** Events shown inside a day cell before "+N more". */
const VISIBLE = 3;

function Padding({ count }: { count: number }) {
  return Array.from({ length: count }, (_, i) => (
    <td key={`pad-${i}`} aria-hidden className="border-l border-line/70 bg-surface-2/40 first:border-l-0" />
  ));
}

function DayCell({ day, onSelect }: { day: CalendarDay; onSelect: (s: CalendarSelection) => void }) {
  const t = useT();
  const { locale } = useLocale();
  const shown = day.events.length > VISIBLE ? day.events.slice(0, VISIBLE - 1) : day.events;
  const more = day.events.length - shown.length;
  return (
    <td
      className={cn(
        "h-32 border-l border-line/70 p-1.5 align-top first:border-l-0",
        day.isweekend && "bg-surface-2/40",
        day.istoday && "bg-primary-soft/60"
      )}
    >
      <div className="mb-1 flex items-center justify-between px-0.5">
        <span
          className={cn(
            "grid h-7 min-w-7 place-items-center rounded-full px-1 text-xs font-bold tabular-nums",
            day.istoday ? "bg-brand-gradient text-white shadow-md shadow-primary/25" : "text-muted"
          )}
        >
          <span aria-hidden>{day.mday}</span>
          <span className="sr-only">
            {formatDate(day.timestamp, locale, { weekday: "long", day: "numeric", month: "long" })}
            {day.istoday ? ` (${t("common.today")})` : ""}
          </span>
        </span>
      </div>
      <ul className="@container space-y-1">
        {shown.map((e) => (
          <li key={e.id}>
            <EventChip event={e} onSelect={(event) => onSelect({ type: "event", event })} />
          </li>
        ))}
        {more > 0 && (
          <li>
            <button
              type="button"
              onClick={() => onSelect({ type: "day", day })}
              className="w-full rounded-lg px-1.5 py-0.5 text-left text-[11px] font-semibold text-primary-text hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-ring"
            >
              {t("calendar.more", { n: more })}
            </button>
          </li>
        )}
      </ul>
    </td>
  );
}

/** Desktop month grid (md and up): weeks × days with event chips. */
export function MonthGrid({
  view,
  label,
  onSelect,
}: {
  view: CalendarMonthView;
  label: string;
  onSelect: (s: CalendarSelection) => void;
}) {
  const { locale } = useLocale();
  return (
    <table className="w-full table-fixed border-collapse" aria-label={label}>
      <thead>
        <tr>
          {view.daynames.map((d) => (
            <th key={d.dayno} scope="col" className="pb-2 text-center text-xs font-bold text-subtle">
              <abbr title={weekdayName(d.dayno, locale, "long")} className="no-underline">
                {weekdayName(d.dayno, locale)}
              </abbr>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {view.weeks.map((week, i) => (
          <tr key={i} className="border-t border-line/70">
            <Padding count={week.prepadding.length} />
            {week.days.map((day) => (
              <DayCell key={day.timestamp} day={day} onSelect={onSelect} />
            ))}
            <Padding count={week.postpadding.length} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}
