"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, CircleDashed, Clock, EyeOff, type LucideIcon } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Badge, Card, ProgressRing, cn } from "@/components/ui";
import { CourseCover } from "@/components/CourseCover";
import { courseStyle } from "@/lib/course-color";
import { courseProgress, courseStatus, type CourseStatus } from "@/lib/courses";
import { formatDate, initials, timeAgo } from "@/lib/format";
import type { CourseDetails, TimelineCourse } from "@/lib/moodle/types";
import { CourseMark } from "./CourseMark";
import { NextActivity } from "./NextActivity";
import { STATUS_META, courseCategory, isHiddenFromStudents } from "./lib";

interface CourseItemProps {
  course: TimelineCourse;
  details?: CourseDetails;
  /** Last time the user opened the course (unix seconds). */
  lastAccess?: number;
  /** Reference time for the status (unix seconds). */
  now: number;
}

/** Everything a card or row shows, derived once. */
function courseModel({ course, details, now }: CourseItemProps) {
  return {
    pct: courseProgress(course),
    status: courseStatus(course, now),
    category: courseCategory(course, details),
    teachers: details?.contacts ?? [],
    hidden: isHiddenFromStudents(course),
  };
}

/* ---------------- Shared parts ---------------- */

function CardLink({ course, children }: { course: TimelineCourse; children: ReactNode }) {
  return (
    <Link
      href={`/courses/${course.id}`}
      style={courseStyle(course.id)}
      className="group block rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {children}
    </Link>
  );
}

/** "CODE · class/slot" line in the course colour. */
function Kicker({ code, category, className }: { code: string; category: string; className?: string }) {
  const text = [code, category].filter(Boolean).join(" · ");
  return (
    <p className={cn("truncate text-xs font-bold text-course", className)} title={text}>
      {text}
    </p>
  );
}

function StatusBadge({ status }: { status: CourseStatus }) {
  const t = useT();
  const meta = STATUS_META[status];
  return (
    <Badge tone={meta.tone} dot>
      {t(meta.labelKey)}
    </Badge>
  );
}

function HiddenBadge() {
  const t = useT();
  return (
    <Badge tone="neutral">
      <EyeOff size={12} strokeWidth={2} aria-hidden />
      {t("courses.hiddenFromStudents")}
    </Badge>
  );
}

function Teachers({ teachers }: { teachers: { id: number; fullname: string }[] }) {
  const t = useT();
  if (!teachers.length) return null;
  const names = teachers.map((p) => p.fullname).join(", ");
  return (
    <span className="flex min-w-0 max-w-full items-center gap-2" title={names}>
      <span
        aria-hidden
        className="grid size-6 shrink-0 place-items-center rounded-full bg-course-soft text-[10px] font-bold text-course"
      >
        {initials(teachers[0].fullname)}
      </span>
      <span className="truncate">
        <span className="sr-only">{t("courses.teacher")}: </span>
        {names}
      </span>
    </span>
  );
}

function MetaItem({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="flex min-w-0 max-w-full items-center gap-1.5">
      <Icon size={14} strokeWidth={1.85} aria-hidden className="shrink-0 text-subtle" />
      <span className="truncate">{children}</span>
    </span>
  );
}

function LastOpened({ time }: { time?: number }) {
  const t = useT();
  const { locale } = useLocale();
  if (!time) return null;
  return <MetaItem icon={Clock}>{t("courses.lastOpened", { time: timeAgo(time, locale) })}</MetaItem>;
}

function NotTracked() {
  const t = useT();
  return <MetaItem icon={CircleDashed}>{t("courses.notTracked")}</MetaItem>;
}

/** Start–end dates; Moodle uses 0 for "not set". */
function CourseDates({ start, end }: { start?: number; end?: number }) {
  const t = useT();
  const { locale } = useLocale();
  const s = formatDate(start, locale);
  const e = formatDate(end, locale);
  const text = s && e ? `${s} – ${e}` : s ? t("courses.startsOn", { date: s }) : e ? t("courses.endsOn", { date: e }) : "";
  if (!text) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs tabular-nums text-subtle">
      <CalendarDays size={13} strokeWidth={1.85} aria-hidden />
      {text}
    </span>
  );
}

function Ring({ pct, size }: { pct: number; size: number }) {
  const t = useT();
  return (
    <ProgressRing value={pct} size={size} stroke={size > 48 ? 5 : 4} tone="course" label={t("courses.progress")}>
      <span className={cn("font-extrabold tabular-nums text-fg", size > 48 ? "text-xs" : "text-[11px]")}>{pct}%</span>
    </ProgressRing>
  );
}

/* ---------------- Grid card ---------------- */

/**
 * Cover card: wide cover with a progress ring, code · class, name, teachers,
 * the next unfinished activity (courses in progress), status and dates.
 */
export function CourseCard(props: CourseItemProps) {
  const { course, lastAccess } = props;
  const { pct, status, category, teachers, hidden } = courseModel(props);
  const showNext = status === "inProgress" && pct !== null && pct < 100;

  return (
    <CardLink course={course}>
      <Card className="flex h-full flex-col overflow-hidden transition duration-200 group-hover:shadow-course motion-safe:group-hover:-translate-y-1">
        <div className="relative">
          {/* Decorative: the generated cover repeats the code the kicker already says. */}
          <div aria-hidden>
            <CourseCover course={course} />
          </div>
          {pct !== null && (
            <div className="absolute -bottom-6 right-4 rounded-full bg-surface p-1 shadow-md">
              <Ring pct={pct} size={52} />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3 p-5 pt-4">
          <div className="min-w-0">
            {/* Only the kicker sits beside the ring; the title starts below it. */}
            <Kicker code={course.shortname} category={category} className={pct !== null ? "pr-14" : undefined} />
            <h3 className="mt-1 line-clamp-2 font-bold leading-snug text-fg">{course.fullname}</h3>
          </div>
          <div className="flex flex-col gap-1.5 text-[13px] text-muted empty:hidden">
            <Teachers teachers={teachers} />
            <LastOpened time={lastAccess} />
            {pct === null && <NotTracked />}
          </div>
          <div className="mt-auto flex flex-col gap-3">
            {showNext && <NextActivity courseId={course.id} />}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={status} />
                {hidden && <HiddenBadge />}
              </div>
              <CourseDates start={course.startdate} end={course.enddate} />
            </div>
          </div>
        </div>
      </Card>
    </CardLink>
  );
}

/* ---------------- List row ---------------- */

/** Compact row with the same data as CourseCard. */
export function CourseRow(props: CourseItemProps) {
  const { course, lastAccess } = props;
  const { pct, status, category, teachers, hidden } = courseModel(props);

  return (
    <CardLink course={course}>
      <Card className="flex items-center gap-3 p-3 transition duration-200 group-hover:shadow-course sm:gap-4 sm:p-4">
        <CourseMark course={course} className="sm:size-16" />
        <div className="min-w-0 flex-1">
          <Kicker code={course.shortname} category={category} />
          <h3 className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug text-fg sm:text-[15px]">
            {course.fullname}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
            <StatusBadge status={status} />
            {hidden && <HiddenBadge />}
            <Teachers teachers={teachers} />
            <LastOpened time={lastAccess} />
            {pct === null && <NotTracked />}
            <CourseDates start={course.startdate} end={course.enddate} />
          </div>
        </div>
        {pct !== null && <Ring pct={pct} size={48} />}
      </Card>
    </CardLink>
  );
}
