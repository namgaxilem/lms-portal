"use client";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, PlayCircle } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Button, Progress } from "@/components/ui";

function BackButton({ courseId }: { courseId?: number }) {
  const t = useT();
  const router = useRouter();
  const icon = <ArrowLeft size={16} strokeWidth={2} />;
  if (!courseId) {
    return (
      <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label={t("scorm.back")} className="lg:h-9 lg:w-9">
        {icon}
      </Button>
    );
  }
  const label = t("activity.backToCourse");
  return (
    <Button
      href={`/courses/${courseId}`}
      variant="ghost"
      size="icon"
      aria-label={label}
      className="shrink-0 lg:h-9 lg:w-9 xl:w-auto xl:px-2.5 xl:text-[13px]"
    >
      {icon}
      <span className="hidden xl:inline">{label}</span>
    </Button>
  );
}

/** Course completion (activities done / tracked) in the header, from md. */
function CourseProgress({ percent }: { percent: number }) {
  const t = useT();
  return (
    <div className="hidden shrink-0 items-center gap-2.5 md:flex">
      <span className="hidden text-xs font-semibold text-muted xl:inline">{t("scorm.courseProgress")}</span>
      {/* Progress is full width: the wrapper sets its size (a className width would lose to w-full). */}
      <div className="w-24 lg:w-28">
        <Progress value={percent} tone="course" size="sm" label={t("scorm.courseProgress")} />
      </div>
      <span className="text-xs font-bold tabular-nums text-fg">{percent}%</span>
    </div>
  );
}

/**
 * Focus-mode header, one row on every screen: back to the course, the activity
 * under its course and section (from sm), course progress (from md), session
 * facts and actions. Must sit inside an element carrying `--course`.
 */
export function PlayerHeader({
  courseId,
  eyebrow,
  title,
  coursePercent,
  facts,
  actions,
}: {
  courseId?: number;
  eyebrow?: string;
  title: string;
  /** Course completion %, null when not tracked for this user. */
  coursePercent: number | null;
  /** Session facts (mode, attempt, clock); the player passes them here from sm. */
  facts?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <header className="relative shrink-0 overflow-hidden rounded-card border border-line/60 bg-surface shadow-card dark:border-line">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-course-gradient" />
      <div className="flex items-center gap-2 px-2 py-2.5 sm:gap-3 sm:px-4">
        <BackButton courseId={courseId} />
        <span
          aria-hidden
          className="hidden h-10 w-10 shrink-0 place-items-center rounded-control bg-course-gradient text-white shadow-course sm:grid"
        >
          <PlayCircle size={20} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          {eyebrow && <p className="hidden truncate text-xs font-semibold text-course sm:block">{eyebrow}</p>}
          <h1 className="truncate text-[15px] font-extrabold text-fg sm:text-lg">{title}</h1>
        </div>
        {coursePercent !== null && <CourseProgress percent={coursePercent} />}
        {facts && <div className="flex shrink-0 items-center gap-1.5">{facts}</div>}
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      </div>
    </header>
  );
}
