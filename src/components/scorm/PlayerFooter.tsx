"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, CircleCheck } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { cn } from "@/components/ui";
import { COURSE_FILL } from "@/lib/course-color";
import type { ScormSco } from "@/lib/moodle/types";

/** Where a footer button goes: another part of this package, another activity, or back to the course. */
export type Step =
  | { kind: "part"; sco: ScormSco; onPick: (sco: ScormSco) => void }
  | { kind: "activity"; name: string; href: string }
  | { kind: "end"; href: string };

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** "Next" on the solid course fill (white text at ≥4.5:1 for every course colour). */
const nextTone = cn(COURSE_FILL, "shadow-course hover:-translate-y-0.5");

function StepButton({ step, direction }: { step: Step; direction: "prev" | "next" }) {
  const t = useT();
  const forward = direction === "next";
  const label =
    step.kind === "end"
      ? t("scorm.lastActivity")
      : step.kind === "part"
        ? t(forward ? "scorm.nextPart" : "scorm.prevPart")
        : t(forward ? "scorm.nextActivity" : "scorm.prevActivity");
  const name = step.kind === "part" ? step.sco.title : step.kind === "activity" ? step.name : t("activity.backToCourse");
  const Icon =
    step.kind === "end" ? CircleCheck : step.kind === "part" ? (forward ? ChevronRight : ChevronLeft) : forward ? ArrowRight : ArrowLeft;

  const className = cn(
    "flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-3 rounded-control p-2.5 transition md:w-44 md:justify-start md:px-3.5 lg:w-48 2xl:w-60",
    forward && "flex-row-reverse md:text-right",
    step.kind === "end" ? "bg-success-soft text-success-text" : forward ? nextTone : "text-fg ring-1 ring-line hover:bg-surface-2",
    focusRing
  );
  const content = (
    <>
      <Icon size={18} strokeWidth={2} aria-hidden className={cn("shrink-0", !forward && "text-subtle")} />
      <span className="hidden min-w-0 flex-1 leading-tight md:block">
        <span className={cn("block truncate text-2xs font-bold uppercase tracking-wide", !forward && "text-subtle")}>{label}</span>
        <span className="mt-0.5 block truncate text-[13px] font-semibold">{name}</span>
      </span>
    </>
  );
  const a11y = { "aria-label": `${label}: ${name}`, title: name };

  if (step.kind === "part") {
    return (
      <button type="button" onClick={() => step.onPick(step.sco)} className={className} {...a11y}>
        {content}
      </button>
    );
  }
  return (
    <Link href={step.href} rel={step.kind === "activity" ? direction : undefined} className={className} {...a11y}>
      {content}
    </Link>
  );
}

/** Keeps the status centred when one side has nowhere to go. */
function StepPlaceholder() {
  return <span aria-hidden className="w-10 shrink-0 md:w-44 lg:w-48 2xl:w-60" />;
}

/**
 * Bottom bar of focus mode: previous / next (the package's parts while there
 * are any, then the course's activities) around the lesson status.
 */
export function PlayerFooter({
  label,
  prev,
  next,
  children,
}: {
  label: string;
  prev: Step | null;
  next: Step | null;
  /** Lesson status: progress, current part, chips. */
  children: ReactNode;
}) {
  return (
    <nav
      aria-label={label}
      className="flex shrink-0 items-center gap-2 rounded-card border border-line/60 bg-surface p-1.5 shadow-card sm:gap-3 sm:p-2 dark:border-line"
    >
      {prev ? <StepButton step={prev} direction="prev" /> : <StepPlaceholder />}
      <div className="min-w-0 flex-1">{children}</div>
      {next ? <StepButton step={next} direction="next" /> : <StepPlaceholder />}
    </nav>
  );
}
