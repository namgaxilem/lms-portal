"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BookOpen, ChevronLeft, Clock, MapPin, Shapes, Users, X } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Button, RichText } from "@/components/ui";
import type { CalendarDay, CalendarEvent } from "@/lib/moodle/types";
import { hasRichContent } from "@/lib/format";
import { EventRow, EventTile } from "./EventParts";
import { dayHeading, eventLook, eventTarget, eventTime } from "./lib";

/** What the dialog shows: one event (optionally opened from a day), or all events of a day. */
export type CalendarSelection =
  | { type: "event"; event: CalendarEvent; from?: CalendarDay }
  | { type: "day"; day: CalendarDay };

function DetailRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="relative min-w-0 pl-[30px]">
      <dt className="text-xs font-semibold text-subtle">
        <Icon size={18} aria-hidden className="absolute left-0 top-0.5 text-subtle" />
        {label}
      </dt>
      <dd className="text-sm text-fg">{children}</dd>
    </div>
  );
}

function Header({ titleId, title, eyebrow, leading, onClose, onBack, backLabel }: {
  titleId: string;
  title: string;
  eyebrow?: string;
  leading?: ReactNode;
  onClose: () => void;
  onBack?: () => void;
  backLabel?: string;
}) {
  const t = useT();
  return (
    <div className="border-b border-line p-5 pb-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 mb-1 inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-primary-text hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ChevronLeft size={16} aria-hidden />
          {backLabel}
        </button>
      )}
      <div className="flex items-start gap-3">
        {leading}
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="text-xs font-semibold text-subtle">{eyebrow}</p>}
          <h2 id={titleId} className="text-lg font-extrabold leading-snug text-fg">
            {title}
          </h2>
        </div>
        <Button variant="ghost" size="icon" aria-label={t("common.close")} onClick={onClose} className="-mr-2 -mt-1.5">
          <X size={18} />
        </Button>
      </div>
    </div>
  );
}

function EventDetail({ event, titleId, onClose, onBack, backLabel }: {
  event: CalendarEvent;
  titleId: string;
  onClose: () => void;
  onBack?: () => void;
  backLabel?: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const look = eventLook(event);
  const link = eventTarget(event);
  const location = event.formattedlocation || event.location;

  return (
    <>
      <Header
        titleId={titleId}
        title={event.name}
        eyebrow={t(look.labelKey)}
        leading={<EventTile event={event} size="md" />}
        onClose={onClose}
        onBack={onBack}
        backLabel={backLabel}
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <dl className="space-y-3">
          <DetailRow icon={Clock} label={t("calendar.when")}>
            {dayHeading(event.timestart, locale)} · <span className="tabular-nums">{eventTime(event, locale)}</span>
          </DetailRow>
          {event.course && (
            <DetailRow icon={BookOpen} label={t("calendar.course")}>
              <Link href={`/courses/${event.course.id}`} className="font-semibold text-primary-text hover:underline">
                {event.course.fullname}
              </Link>
            </DetailRow>
          )}
          {event.activityname && event.activityname !== event.name && (
            <DetailRow icon={Shapes} label={t("calendar.activity")}>
              {event.activityname}
            </DetailRow>
          )}
          {hasRichContent(location) && (
            <DetailRow icon={MapPin} label={t("calendar.location")}>
              <RichText html={location} className="break-words" />
            </DetailRow>
          )}
          {event.groupname && (
            <DetailRow icon={Users} label={t("calendar.group")}>
              {event.groupname}
            </DetailRow>
          )}
        </dl>
        {hasRichContent(event.description) && (
          <div className="mt-5 border-t border-line pt-4">
            <RichText html={event.description} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-line p-4">
        <Button variant="secondary" onClick={onClose}>
          {t("common.close")}
        </Button>
        {link && (
          <Button variant="gradient" href={link.href}>
            {t(link.kind === "activity" ? "calendar.openActivity" : "calendar.openCourse")}
            <ArrowRight size={16} aria-hidden />
          </Button>
        )}
      </div>
    </>
  );
}

/**
 * Event / day details in a native modal <dialog> (focus trap, Escape and
 * backdrop to close): a centred card on larger screens, a bottom sheet on phones.
 */
export function EventDialog({
  selection,
  onChange,
}: {
  selection: CalendarSelection | null;
  onChange: (next: CalendarSelection | null) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const open = selection !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => onChange(null);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="m-auto max-h-[min(42rem,calc(100dvh-2rem))] w-[min(34rem,calc(100%-2rem))] max-w-none overflow-hidden rounded-card border border-line bg-surface p-0 text-fg shadow-pop backdrop:bg-slate-950/50 max-sm:mb-0 max-sm:max-h-[85dvh] max-sm:w-full max-sm:rounded-b-none"
    >
      <div className="flex max-h-[inherit] flex-col">
        {selection?.type === "event" && (
          <EventDetail
            key={selection.event.id}
            event={selection.event}
            titleId={titleId}
            onClose={close}
            onBack={selection.from ? () => onChange({ type: "day", day: selection.from! }) : undefined}
            backLabel={selection.from ? dayHeading(selection.from.timestamp, locale) : undefined}
          />
        )}
        {selection?.type === "day" && (
          <>
            <Header
              titleId={titleId}
              title={dayHeading(selection.day.timestamp, locale)}
              eyebrow={t("calendar.eventCount", { n: selection.day.events.length })}
              onClose={close}
            />
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
              {selection.day.events.map((e) => (
                <li key={e.id}>
                  <EventRow event={e} onSelect={(ev) => onChange({ type: "event", event: ev, from: selection.day })} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </dialog>
  );
}
