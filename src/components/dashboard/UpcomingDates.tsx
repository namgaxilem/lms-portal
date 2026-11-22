"use client";
import Link from "next/link";
import { CalendarCheck2, CalendarDays, Clock } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Badge, Card, EmptyState, IconTile, QueryState, SectionTitle, Skeleton, cn, type Tone } from "@/components/ui";
import { formatDateTime, formatTime, isToday, isTomorrow } from "@/lib/format";
import { moduleMeta } from "@/lib/module-meta";
import type { DateKind } from "@/lib/moodle/dates";
import { SectionLink } from "./SectionLink";
import type { UpcomingDate } from "./useUpcomingDates";

type T = ReturnType<typeof useT>;

/** Columns follow the section's own width (it sits in a dashboard column). */
const GRID = "grid gap-4 @md:grid-cols-2 @2xl:grid-cols-3";

const HOUR = 3600;
const DAY = 86400;

/** Coloured strip on top of each card, by kind of date. */
const STRIP: Record<DateKind, string> = {
  close: "from-rose-400 to-rose-600",
  due: "from-rose-400 to-rose-600",
  open: "from-sky-400 to-sky-600",
  other: "from-violet-400 to-violet-600",
};

/** "5 min" / "3 h" / "2 d" until `time`. */
function span(seconds: number, t: T) {
  if (seconds < HOUR) return t("common.unit.minute", { n: Math.max(1, Math.floor(seconds / 60)) });
  if (seconds < DAY) return t("common.unit.hour", { n: Math.floor(seconds / HOUR) });
  return t("common.unit.day", { n: Math.floor(seconds / DAY) });
}

/** Countdown chip: solid red when a close/due date is overdue or within a day. */
function countdown(d: UpcomingDate, now: number, t: T): { text: string; tone: Tone; solid: boolean } {
  if (d.overdue) return { text: t("dashboard.overdue"), tone: "danger", solid: true };
  const left = d.time - now;
  const time = span(left, t);
  if (d.kind === "open") return { text: t("dashboard.opensIn", { time }), tone: "accent", solid: false };
  if (d.kind === "other") return { text: t("dashboard.startsIn", { time }), tone: "violet", solid: false };
  const text = t("assignment.time.left", { time });
  if (left < DAY) return { text, tone: "danger", solid: true };
  return { text, tone: left < 3 * DAY ? "warning" : "neutral", solid: false };
}

/** "Closes · Today, 23:56" / "Opens · Mon, 23/11, 07:00". */
function when(d: UpcomingDate, locale: string, t: T) {
  const at = isToday(d.time)
    ? t("dashboard.dueToday", { time: formatTime(d.time, locale) })
    : isTomorrow(d.time)
      ? t("dashboard.dueTomorrow", { time: formatTime(d.time, locale) })
      : formatDateTime(d.time, locale, { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return d.kind === "other" ? at : `${t(`dashboard.kind.${d.kind}`)} · ${at}`;
}

function DateCard({ date, now }: { date: UpcomingDate; now: number }) {
  const t = useT();
  const { locale } = useLocale();
  // Course, user and site events have no activity: show a calendar tile.
  const meta = date.modname ? moduleMeta(date.modname) : null;
  const chip = countdown(date, now, t);
  const Icon = date.kind === "open" || date.kind === "other" ? CalendarDays : Clock;
  const status = date.notOpenYet ? (
    <Badge tone="neutral">{t("dashboard.notOpenYet")}</Badge>
  ) : date.todo ? (
    <Badge tone="primary" dot>
      {t("dashboard.todo")}
    </Badge>
  ) : null;

  const body = (
    <>
      <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1.5 bg-linear-to-r", STRIP[date.kind])} />
      <div className="flex items-center justify-between gap-2">
        <IconTile icon={meta?.icon ?? CalendarDays} tone={meta?.tone ?? "violet"} />
        <Badge tone={chip.tone} solid={chip.solid} className="tabular-nums">
          {chip.text}
        </Badge>
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-2 font-bold leading-snug text-fg group-hover:text-primary-text">{date.title}</h3>
        <p className="mt-1 truncate text-[13px] text-subtle">
          {[date.course?.shortname, meta ? t(meta.labelKey) : null].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted">
          <Icon size={15} strokeWidth={2} aria-hidden />
          {when(date, locale, t)}
        </p>
        {status}
      </div>
    </>
  );

  const cls =
    "group relative flex h-full flex-col gap-3 overflow-hidden rounded-card border border-line/60 bg-surface p-5 pt-6 shadow-card dark:border-line";
  return date.href ? (
    <Link
      href={date.href}
      className={cn(cls, "transition duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring")}
    >
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function DatesSkeleton() {
  return (
    <div className={GRID}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={cn("space-y-3 rounded-card border border-line/60 bg-surface p-5 dark:border-line", i === 2 && "hidden @2xl:block")}>
          <div className="flex justify-between">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** The next few dates as cards (overdue to-dos first, then by date). */
export function UpcomingDates({
  dates,
  now,
  loading,
  error,
  limit = 3,
}: {
  dates: UpcomingDate[];
  now: number;
  loading: boolean;
  error: string | null;
  limit?: number;
}) {
  const t = useT();
  const shown = dates.slice(0, limit);

  return (
    <section aria-labelledby="dashboard-dates" className="@container">
      <SectionTitle
        title={<span id="dashboard-dates">{t("dashboard.upcomingTitle")}</span>}
        action={<SectionLink href="/calendar">{t("nav.calendar")}</SectionLink>}
      />
      <QueryState loading={loading} error={error} skeleton={<DatesSkeleton />}>
        {shown.length === 0 ? (
          <Card>
            <EmptyState compact icon={CalendarCheck2} title={t("dashboard.noUpcomingDates")} hint={t("dashboard.noUpcomingHint")} />
          </Card>
        ) : (
          <ul className={GRID}>
            {shown.map((d, i) => (
              // An odd last card spans both columns on the two-column layout.
              <li key={d.id} className={cn(i === shown.length - 1 && i % 2 === 0 && i > 0 && "@md:col-span-2 @2xl:col-span-1")}>
                <DateCard date={d} now={now} />
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </section>
  );
}
