"use client";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { IconTile, cn, toneClass } from "@/components/ui";
import { courseStyle } from "@/lib/course-color";
import { formatTime } from "@/lib/format";
import type { CalendarEvent } from "@/lib/moodle/types";
import { eventLook, eventTime } from "./lib";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Solid icon tile of an event: the activity icon on its course colour (or the event type's tone). */
export function EventTile({ event, size = "sm" }: { event: CalendarEvent; size?: "sm" | "md" }) {
  const look = eventLook(event);
  if (look.courseId === null) return <IconTile icon={look.icon} tone={look.tone} solid size={size} />;
  const Icon = look.icon;
  return (
    <span
      aria-hidden
      style={courseStyle(look.courseId)}
      className={cn(
        "flex shrink-0 items-center justify-center bg-course-gradient text-white shadow-course",
        size === "sm" ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-2xl"
      )}
    >
      <Icon size={size === "sm" ? 17 : 20} strokeWidth={2} />
    </span>
  );
}

/**
 * Compact event pill inside a month-grid day (its time shows when the day is
 * wide enough; needs an @container parent). Course events keep their colour on
 * the icon and edge; the 11px label stays `text-fg` for contrast.
 */
export function EventChip({ event, onSelect }: { event: CalendarEvent; onSelect: (e: CalendarEvent) => void }) {
  const { locale } = useLocale();
  const look = eventLook(event);
  const Icon = look.icon;
  const course = look.courseId !== null;
  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      style={look.courseId !== null ? courseStyle(look.courseId) : undefined}
      title={event.name}
      className={cn(
        "flex w-full min-w-0 items-center gap-1 rounded-lg px-1.5 py-1 text-left text-[11px] font-semibold leading-tight transition hover:brightness-95 dark:hover:brightness-125",
        course ? "border-l-[3px] bg-course-soft text-fg [border-left-color:var(--course)]" : toneClass[look.tone],
        focusRing
      )}
    >
      <Icon size={12} aria-hidden className={cn("shrink-0", course && "text-course")} />
      <span className="sr-only shrink-0 tabular-nums opacity-80 @[7.5rem]:not-sr-only">{formatTime(event.timestart, locale)}</span>
      <span className="truncate">{event.name}</span>
    </button>
  );
}

/** Event in a list (upcoming / agenda / a day): tile, name, time and course. */
export function EventRow({ event, onSelect }: { event: CalendarEvent; onSelect: (e: CalendarEvent) => void }) {
  const t = useT();
  const { locale } = useLocale();
  const look = eventLook(event);
  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className={cn("flex w-full items-start gap-3 rounded-2xl p-2.5 text-left transition hover:bg-surface-2", focusRing)}
    >
      <EventTile event={event} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-snug text-fg">{event.name}</span>
        <span className="mt-0.5 block text-xs text-subtle">
          <span className="tabular-nums">{eventTime(event, locale)}</span>
          {" · "}
          {event.course?.shortname ?? t(look.labelKey)}
        </span>
      </span>
    </button>
  );
}
