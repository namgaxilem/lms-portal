"use client";
import { useState } from "react";
import Link from "next/link";
import { App } from "antd";
import {
  Check,
  Circle,
  CircleCheck,
  CircleX,
  Clock,
  EyeOff,
  LoaderCircle,
  Lock,
  Play,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Badge, IconTile, RichText, cn, solidClass, type Tone } from "@/components/ui";
import { COURSE_FILL } from "@/lib/course-color";
import { formatDateTime, hasRichContent, plainText } from "@/lib/format";
import { isModuleDone, isNavigable, isStealth, isTracked, moduleRoute } from "@/lib/moodle/course-outline";
import { moduleMeta } from "@/lib/module-meta";
import type { CourseModule } from "@/lib/moodle/types";
import {
  deadlineTone,
  fileSummary,
  isManualCompletion,
  isSettled,
  moduleTiming,
  relativeTime,
  type Timing,
} from "./lib";

export type ToggleCompletion = (cmid: number, completed: boolean) => Promise<void>;

/** Restriction / "not available" note (Moodle HTML). */
export function AvailabilityNote({ html, className }: { html: string; className?: string }) {
  return (
    <div className={cn("flex gap-2 rounded-xl bg-surface-2 px-3 py-2", className)}>
      <Lock size={14} strokeWidth={2} className="mt-1 shrink-0 text-subtle" aria-hidden />
      <RichText html={html} className="min-w-0" />
    </div>
  );
}

type BadgeState = Timing["state"] | "overdue";

const TIMING_ICON: Record<BadgeState, LucideIcon> = {
  notOpen: Lock,
  closed: Lock,
  closing: Clock,
  due: Clock,
  pastDue: Clock,
  overdue: TriangleAlert,
};

/** "Opens in 3 days" / "Closes tomorrow" / "Closed" chip from the module dates. */
function TimingBadge({
  timing,
  now,
  overdue,
  settled,
}: {
  timing: Timing | null;
  now: number;
  /** The calendar still lists the activity as overdue (work not submitted). */
  overdue: boolean;
  settled: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  // Finished work needs no countdown; a future opening date still matters.
  if (!timing || (settled && timing.state !== "notOpen")) return null;
  const state: BadgeState = timing.state === "pastDue" && overdue ? "overdue" : timing.state;
  const when = relativeTime(timing.time, now, locale);
  const text = {
    notOpen: t("course.timing.opens", { time: when }),
    closed: t("course.timing.closed"),
    closing: t("course.timing.closes", { time: when }),
    due: t("course.timing.due", { time: when }),
    pastDue: t("course.timing.duePassed"),
    overdue: t("course.timing.overdue"),
  }[state];
  const tone: Tone =
    state === "closing" || state === "due" ? deadlineTone(timing.time, now) : state === "overdue" ? "danger" : "neutral";
  const exact = formatDateTime(timing.time, locale);
  const Icon = TIMING_ICON[state];
  return (
    <Badge tone={tone} title={exact}>
      <Icon size={12} strokeWidth={2.25} aria-hidden />
      <time dateTime={new Date(timing.time * 1000).toISOString()}>
        {text}
        <span className="sr-only"> ({exact})</span>
      </time>
    </Badge>
  );
}

/** Completion state: a toggle for manual completion, a status icon otherwise. */
function CompletionControl({ mod, onToggle }: { mod: CourseModule; onToggle: ToggleCompletion }) {
  const t = useT();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  if (!isTracked(mod)) return null;
  const done = isModuleDone(mod);

  if (isManualCompletion(mod)) {
    // One fixed name: aria-pressed already says whether it is done.
    const label = t("course.completion.markComplete", { name: mod.name });
    const toggle = async () => {
      if (busy) return;
      setBusy(true);
      try {
        await onToggle(mod.id, !done);
      } catch {
        message.error(t("course.completion.error"));
      } finally {
        setBusy(false);
      }
    };
    return (
      // aria-disabled instead of disabled while saving, so focus stays on the button.
      <button
        type="button"
        aria-pressed={done}
        aria-label={label}
        aria-disabled={busy || undefined}
        title={label}
        onClick={toggle}
        className={cn(
          "relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          busy && "cursor-progress opacity-60",
          done
            ? "bg-success text-white shadow-sm shadow-success/30 hover:opacity-90"
            : "border-2 border-dashed border-subtle text-subtle hover:border-success hover:text-success-text"
        )}
      >
        {busy ? (
          <LoaderCircle size={16} className="animate-spin" aria-hidden />
        ) : (
          <Check size={16} strokeWidth={3} aria-hidden className={done ? undefined : "opacity-50"} />
        )}
      </button>
    );
  }

  const failed = !done && mod.completiondata?.state === 3;
  const label = t(done ? "course.completion.done" : failed ? "course.completion.failed" : "course.completion.todo");
  const Icon = done ? CircleCheck : failed ? CircleX : Circle;
  return (
    <span role="img" aria-label={label} title={label} className="relative z-10 grid h-10 w-10 shrink-0 place-items-center">
      <Icon
        size={24}
        strokeWidth={done || failed ? 2 : 1.75}
        aria-hidden
        className={done ? "text-success" : failed ? "text-warning" : "text-subtle"}
      />
    </span>
  );
}

const CTA_BASE = "inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[13px]";

/**
 * The row's visual call to action (the whole row is the link, so it is
 * decorative): "Continue" for the resume target, the module's own verb in its
 * colour for work to do, an outline for finished or closed work.
 */
function RowAction({
  mod,
  resume,
  settled,
  timing,
}: {
  mod: CourseModule;
  resume: boolean;
  settled: boolean;
  timing: Timing | null;
}) {
  const t = useT();
  if (timing?.state === "notOpen") {
    return <span className={cn(CTA_BASE, "bg-surface-2 font-semibold text-muted")}>{t("course.section.locked")}</span>;
  }
  if (resume) {
    return (
      <span className={cn(CTA_BASE, COURSE_FILL, "font-bold shadow-sm")}>
        <Play size={14} fill="currentColor" />
        {t("course.continue")}
      </span>
    );
  }
  if (settled || timing?.state === "closed") {
    return (
      <span className={cn(CTA_BASE, "font-semibold text-muted ring-1 ring-line")}>
        {t(settled ? "course.review" : "common.open")}
      </span>
    );
  }
  const verb = mod.modname === "quiz" ? "courses.attempt" : mod.modname === "scorm" ? "courses.launch" : "common.open";
  return <span className={cn(CTA_BASE, solidClass[moduleMeta(mod.modname).tone], "font-bold shadow-sm")}>{t(verb)}</span>;
}

/** One activity of the course outline. */
export function ModuleRow({
  mod,
  courseId,
  now,
  resume,
  overdue,
  onToggleCompletion,
}: {
  mod: CourseModule;
  courseId: number;
  now: number;
  /** This is where "Continue" leads. */
  resume: boolean;
  /** The calendar lists the activity as overdue. */
  overdue: boolean;
  onToggleCompletion: ToggleCompletion;
}) {
  const t = useT();
  const { locale } = useLocale();
  const meta = moduleMeta(mod.modname);
  const file = fileSummary(mod, locale);
  const href = isNavigable(mod) ? moduleRoute(mod, courseId) : null;
  const locked = mod.uservisible === false;
  const settled = isSettled(mod);
  const timing = moduleTiming(mod, now);
  const outsideWindow = timing?.state === "notOpen" || timing?.state === "closed";
  const snippet = mod.description ? plainText(mod.description) : "";

  return (
    <li
      className={cn(
        "relative flex items-center gap-3 px-3.5 py-3.5 sm:gap-4 sm:px-5",
        resume ? "bg-course-soft" : href && "transition-colors hover:bg-surface-2/70"
      )}
    >
      <IconTile
        icon={locked ? Lock : meta.icon}
        tone={locked ? "neutral" : meta.tone}
        size="sm"
        className={cn("sm:h-11 sm:w-11 sm:rounded-2xl", (locked || outsideWindow) && "opacity-60")}
      />
      <div className="min-w-0 flex-1">
        {href ? (
          <Link
            href={href}
            title={mod.name}
            className="line-clamp-2 font-bold text-fg after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
          >
            {mod.name}
          </Link>
        ) : (
          <p className="line-clamp-2 font-bold text-fg" title={mod.name}>
            {mod.name}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-subtle">
          <span>
            {t(meta.labelKey)}
            {file && ` · ${file}`}
          </span>
          {resume && (
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold sm:hidden", COURSE_FILL)}>
              {t("course.continue")}
            </span>
          )}
          <TimingBadge timing={timing} now={now} overdue={overdue} settled={settled} />
          {mod.visible === 0 && (
            <Badge tone="neutral">
              <EyeOff size={12} strokeWidth={2.25} aria-hidden />
              {t("course.hiddenFromStudents")}
            </Badge>
          )}
          {isStealth(mod) && (
            <Badge tone="neutral">
              <EyeOff size={12} strokeWidth={2.25} aria-hidden />
              {t("course.notOnCoursePage")}
            </Badge>
          )}
        </div>
        {snippet && <p className="mt-1 hidden truncate text-xs text-subtle sm:block">{snippet}</p>}
        {hasRichContent(mod.availabilityinfo) && <AvailabilityNote html={mod.availabilityinfo} className="relative z-10 mt-2" />}
      </div>
      {href && (
        <span aria-hidden className="hidden shrink-0 sm:block">
          <RowAction mod={mod} resume={resume} settled={settled} timing={timing} />
        </span>
      )}
      <CompletionControl mod={mod} onToggle={onToggleCompletion} />
    </li>
  );
}

/** A label: teacher text shown inline, not a row to open. */
export function LabelRow({ mod }: { mod: CourseModule }) {
  if (!hasRichContent(mod.description)) return null;
  return (
    <li className="px-3.5 py-3 sm:px-5">
      <RichText html={mod.description} />
    </li>
  );
}
