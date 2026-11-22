"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleCheck, ListTree } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { COURSE_FILL, courseStyle } from "@/lib/course-color";
import { Skeleton, cn } from "@/components/ui";
import type { CourseModule } from "@/lib/moodle/types";
import { moduleRoute } from "@/lib/moodle/course-outline";
import { CourseOutlineDrawer } from "./CourseOutlineDrawer";
import { useCourseNavigationState, type CourseNavigation } from "./course-navigation";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** One side of the bar: a small label over a truncated name, arrow on the outer edge. */
function StepLink({
  href,
  label,
  name,
  direction,
  tone,
}: {
  href: string;
  label: string;
  name: string;
  direction: "prev" | "next" | "end";
  tone: "plain" | "course" | "success";
}) {
  const forward = direction !== "prev";
  const Icon = direction === "prev" ? ArrowLeft : direction === "next" ? ArrowRight : CircleCheck;
  return (
    <Link
      href={href}
      rel={direction === "end" ? undefined : direction}
      title={name}
      className={cn(
        "group flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 transition sm:gap-3 sm:px-3",
        forward && "flex-row-reverse text-right",
        tone === "plain" && "text-fg hover:bg-surface-2",
        tone === "course" && cn(COURSE_FILL, "shadow-course hover:-translate-y-px"),
        tone === "success" && "bg-success-soft text-fg",
        focusRing
      )}
    >
      <Icon
        size={18}
        strokeWidth={2}
        aria-hidden
        className={cn(
          "shrink-0 transition-transform",
          tone === "plain" && "text-subtle group-hover:-translate-x-0.5",
          tone === "course" && "group-hover:translate-x-0.5",
          tone === "success" && "text-success-text"
        )}
      />
      <span className="min-w-0 flex-1 leading-tight">
        <span
          className={cn(
            "block truncate text-2xs font-bold uppercase tracking-wide",
            tone === "plain" && "text-subtle",
            tone === "success" && "text-success-text"
          )}
        >
          {label}
        </span>
        <span className="mt-0.5 block truncate text-[13px] font-semibold">{name}</span>
      </span>
    </Link>
  );
}

function PrevLink({ mod, courseId }: { mod: CourseModule | null; courseId: number }) {
  const t = useT();
  if (!mod) return <span aria-hidden />;
  return (
    <StepLink href={moduleRoute(mod, courseId)} label={t("activity.nav.prev")} name={mod.name} direction="prev" tone="plain" />
  );
}

/** Next activity; after the last one, the way back to the course. */
function NextLink({ mod, atEnd, courseId }: { mod: CourseModule | null; atEnd: boolean; courseId: number }) {
  const t = useT();
  if (!mod) {
    if (!atEnd) return <span aria-hidden />;
    return (
      <StepLink
        href={`/courses/${courseId}`}
        label={t("activity.nav.end")}
        name={t("activity.backToCourse")}
        direction="end"
        tone="success"
      />
    );
  }
  return (
    <StepLink href={moduleRoute(mod, courseId)} label={t("activity.nav.next")} name={mod.name} direction="next" tone="course" />
  );
}

/**
 * Opens the course outline drawer. "bar": the middle of the navigation bar
 * (icon only on phones); "header": a standalone button with the position.
 */
export function OutlineButton({
  courseId,
  cmid,
  nav,
  variant,
}: {
  courseId: number;
  cmid: number;
  nav: CourseNavigation;
  variant: "bar" | "header";
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const position = nav.index >= 0 ? `${nav.index + 1}/${nav.items.length}` : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "flex items-center justify-center gap-2 rounded-xl font-semibold transition",
          variant === "bar"
            ? "min-w-11 px-3 text-[13px] text-muted ring-1 ring-line hover:bg-surface-2 hover:text-fg sm:px-4"
            : "h-10 bg-surface px-4 text-sm text-fg shadow-card ring-1 ring-line hover:bg-surface-2",
          focusRing
        )}
      >
        <ListTree size={17} strokeWidth={1.9} aria-hidden className="shrink-0" />
        <span className={cn(variant === "bar" && "max-sm:sr-only")}>{t("activity.nav.contents")}</span>
        {position && (
          <span className={cn("tabular-nums text-subtle", variant === "bar" && "hidden sm:inline")}>
            <span className="sr-only">· </span>
            {position}
          </span>
        )}
      </button>
      <CourseOutlineDrawer open={open} onClose={() => setOpen(false)} courseId={courseId} cmid={cmid} nav={nav} />
    </>
  );
}

/**
 * Course navigation for an activity: previous / next activity and a "Contents"
 * drawer with the course outline. Shows a same-size placeholder while the
 * course contents load and nothing when they can't be read.
 */
export function ActivityNav({ courseId, cmid }: { courseId: number; cmid: number }) {
  const t = useT();
  const { nav, loading } = useCourseNavigationState(courseId, cmid);
  if (loading) return <Skeleton className="h-15 w-full rounded-2xl" />;
  if (!nav) return null;

  return (
    <nav
      aria-label={t("activity.nav.label")}
      style={courseStyle(courseId)}
      className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-1.5 rounded-2xl bg-surface p-1.5 shadow-card ring-1 ring-line/60 animate-fade-in dark:ring-line"
    >
      <PrevLink mod={nav.prev} courseId={courseId} />
      <OutlineButton courseId={courseId} cmid={cmid} nav={nav} variant="bar" />
      <NextLink mod={nav.next} atEnd={nav.index >= 0} courseId={courseId} />
    </nav>
  );
}
