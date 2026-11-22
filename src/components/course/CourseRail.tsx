"use client";
import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Button, Card, Progress, Skeleton, cn, toneClass, type Tone } from "@/components/ui";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDate, formatTime, isToday, isTomorrow, stripHtml } from "@/lib/format";
import type { CourseDetails, CourseGradeOverview } from "@/lib/moodle/types";
import { deadlineTone, relativeTime, type UpcomingItem } from "./lib";
import { MessageLink } from "./MessageLink";

function RailCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card className={cn("p-5", className)}>
      <h2 className="font-extrabold text-fg">{title}</h2>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function RailSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

interface SectionIndexItem {
  id: number;
  title: string;
  done: number;
  total: number;
}

/**
 * Index of the course sections; each row jumps to its section in the content
 * tab. Done / total bars where completion is tracked for the user.
 */
export function SectionsCard({
  sections,
  onJump,
}: {
  /** null while the contents load; empty when they could not be loaded. */
  sections: SectionIndexItem[] | null;
  onJump: (sectionId: number) => void;
}) {
  const t = useT();
  if (sections && sections.length === 0) return null;
  const tracked = !!sections?.some((s) => s.total > 0);
  const jump = (e: MouseEvent, id: number) => {
    e.preventDefault();
    onJump(id);
  };
  return (
    <RailCard title={t(tracked ? "course.rail.sections" : "course.rail.outline")}>
      {!sections ? (
        <RailSkeleton />
      ) : (
        <ul className="-mx-2 space-y-1">
          {sections.map((s) => {
            const percent = s.total > 0 ? Math.round((s.done / s.total) * 100) : null;
            return (
              <li key={s.id}>
                <a
                  href={`#sec-${s.id}`}
                  onClick={(e) => jump(e, s.id)}
                  className="block rounded-xl px-2 py-2 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="flex justify-between gap-3 text-[13px]">
                    <span className="truncate font-semibold text-fg" title={s.title}>
                      {s.title}
                    </span>
                    {percent !== null && (
                      <span className="shrink-0 tabular-nums text-subtle">
                        {s.done}/{s.total}
                      </span>
                    )}
                  </span>
                  {percent !== null && (
                    // Repeats the numbers above, so assistive tech skips it.
                    <div aria-hidden className="mt-1.5">
                      <Progress value={percent} tone={percent === 100 ? "success" : "course"} size="sm" />
                    </div>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </RailCard>
  );
}

/** Start and end dates with how much of the course time has passed. */
export function CourseDatesCard({ start, end, now }: { start?: number; end?: number; now: number }) {
  const t = useT();
  const { locale } = useLocale();
  if (!start) return null;
  const elapsed = end && end > start ? Math.round(((now - start) / (end - start)) * 100) : null;
  return (
    <RailCard title={t("course.rail.dates")}>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs font-semibold text-subtle">{t("courses.starts")}</dt>
          <dd className="mt-0.5 font-bold tabular-nums text-fg">{formatDate(start, locale)}</dd>
        </div>
        {!!end && (
          <div>
            <dt className="text-xs font-semibold text-subtle">{t("courses.ends")}</dt>
            <dd className="mt-0.5 font-bold tabular-nums text-fg">{formatDate(end, locale)}</dd>
          </div>
        )}
      </dl>
      <div className="mt-4 text-[13px] text-subtle">
        {now < start ? (
          t("course.dates.startsIn", { time: relativeTime(start, now, locale) })
        ) : end && now > end ? (
          t("course.dates.ended")
        ) : elapsed !== null ? (
          <>
            <Progress value={elapsed} tone="course" size="sm" label={t("course.dates.elapsed", { n: elapsed })} />
            <p className="mt-1.5">{t("course.dates.elapsed", { n: elapsed })}</p>
          </>
        ) : null}
      </div>
    </RailCard>
  );
}

/** Current course total from the gradebook overview; opens the grades tab. */
export function GradeCard({
  grade,
  loading,
  onOpen,
}: {
  grade: CourseGradeOverview | undefined;
  loading: boolean;
  onOpen: () => void;
}) {
  const t = useT();
  const text = grade?.grade ? stripHtml(grade.grade) : "";
  const graded = text !== "" && text !== "-";
  if (loading) return <Skeleton className="h-36 w-full rounded-card" />;
  if (!graded) {
    return (
      <RailCard title={t("course.rail.grade")}>
        <p className="text-sm text-subtle">{t("course.rail.noGrade")}</p>
        <Button variant="secondary" size="md" className="mt-4" onClick={onOpen}>
          {t("course.rail.gradeDetails")}
        </Button>
      </RailCard>
    );
  }
  return (
    <section className="relative isolate overflow-hidden rounded-card bg-linear-to-br from-emerald-700 to-teal-700 p-5 text-white shadow-lg shadow-emerald-700/25 dark:shadow-none">
      <span aria-hidden className="absolute -right-8 -top-10 -z-10 h-32 w-32 rounded-full bg-white/10" />
      <h2 className="text-sm font-semibold">{t("course.rail.grade")}</h2>
      <p className="mt-1 text-4xl font-extrabold tabular-nums">{text}</p>
      <p className="mt-1 text-[13px]">{t("course.rail.gradeHint")}</p>
      <Button variant="light" size="md" className="mt-4" onClick={onOpen}>
        {t("course.rail.gradeDetails")}
      </Button>
    </section>
  );
}

/** Course contacts (teachers) with a message shortcut. */
export function TeachersCard({ contacts, selfId }: { contacts: NonNullable<CourseDetails["contacts"]>; selfId: number }) {
  const t = useT();
  if (!contacts.length) return null;
  return (
    <RailCard title={t("course.members.teachers")}>
      <ul className="space-y-3">
        {contacts.map((c) => (
          <li key={c.id} className="flex items-center gap-3">
            <UserAvatar name={c.fullname} id={c.id} size={40} />
            <p className="min-w-0 flex-1 truncate text-sm font-bold text-fg" title={c.fullname}>
              {c.fullname}
            </p>
            {c.id !== selfId && <MessageLink userId={c.id} name={c.fullname} />}
          </li>
        ))}
      </ul>
    </RailCard>
  );
}

function chipTone(item: UpcomingItem, now: number): Tone {
  if (item.overdue) return "danger";
  if (item.kind === "close" || item.kind === "due") return deadlineTone(item.time, now);
  return item.kind === "open" ? "accent" : "neutral";
}

/** Next open / close / due dates of this course's activities. */
export function UpcomingCard({ items, now }: { items: UpcomingItem[] | null; now: number }) {
  const t = useT();
  const { locale } = useLocale();
  const day = (item: UpcomingItem) => {
    if (item.overdue) return t("course.timing.overdue");
    if (isToday(item.time)) return t("common.today");
    if (isTomorrow(item.time)) return t("course.tomorrow");
    return formatDate(item.time, locale, { day: "2-digit", month: "2-digit" });
  };
  const text = (item: UpcomingItem) =>
    item.kind === "other" ? item.label : `${t(`course.upcoming.${item.kind}`)} · ${item.name}`;

  return (
    <RailCard title={t("course.rail.upcoming")}>
      {!items ? (
        <RailSkeleton />
      ) : items.length === 0 ? (
        <p className="text-sm text-subtle">{t("course.upcoming.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {items.slice(0, 5).map((item) => (
            <li key={item.key} className="flex items-center gap-3">
              <span
                className={cn(
                  "w-20 shrink-0 truncate rounded-full px-2 py-1 text-center text-xs font-bold tabular-nums",
                  toneClass[chipTone(item, now)]
                )}
              >
                {day(item)}
              </span>
              <div className="min-w-0 flex-1">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="block truncate text-sm font-semibold text-fg transition-colors hover:text-primary-text"
                    title={text(item)}
                  >
                    {text(item)}
                  </Link>
                ) : (
                  <p className="truncate text-sm font-semibold text-fg" title={text(item)}>
                    {text(item)}
                  </p>
                )}
                <p className="text-xs tabular-nums text-subtle">
                  <time dateTime={new Date(item.time * 1000).toISOString()}>{formatTime(item.time, locale)}</time>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </RailCard>
  );
}
