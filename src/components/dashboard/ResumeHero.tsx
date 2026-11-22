"use client";
import Link from "next/link";
import { BookOpen, Clock, Play, RotateCw, Sparkles } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Button, HeroCard, Progress, Skeleton, cn } from "@/components/ui";
import { CourseCover } from "@/components/CourseCover";
import { courseStyle } from "@/lib/course-color";
import { courseProgress, type CourseResume } from "@/lib/courses";
import { formatDuration, timeAgo } from "@/lib/format";
import { resumeHref, useScormProgress } from "@/lib/moodle/hooks";
import { moduleMeta } from "@/lib/module-meta";

const chipClass =
  "inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1 text-xs font-bold ring-1 ring-inset ring-white/25 backdrop-blur-sm";
const ghostClass =
  "inline-flex h-12 items-center gap-2 rounded-2xl bg-white/10 px-5 text-[15px] font-semibold text-white ring-1 ring-white/30 backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/** "Continue learning" banner in the colour of the course to resume. */
export function ResumeHero({
  target,
  lastAccess,
  staff,
  className,
}: {
  target: CourseResume;
  /** Last access of the course (unix seconds), used when resuming at the course page. */
  lastAccess?: number;
  /** Teachers resume what they opened; "continue learning" is learner wording. */
  staff: boolean;
  className?: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { course, item } = target;
  const isScorm = item?.modname === "scorm";
  const { progress: scorm, loading: scormLoading } = useScormProgress(
    isScorm ? item.cmid : null,
    isScorm ? item.courseid : null
  );

  const meta = item ? moduleMeta(item.modname) : null;
  const TypeIcon = meta?.icon;
  const href = resumeHref(target);
  const coursePct = courseProgress(course);
  const openedAt = item?.timeaccess ?? lastAccess;
  // The bar shows SCORM progress when there is one, else the course's own progress
  // (held back while SCORM progress loads, so it does not jump from one to the other).
  let bar: { value: number; label: string } | null = null;
  if (scorm) bar = { value: scorm.percent, label: t("dashboard.scormProgress") };
  else if (!scormLoading && coursePct !== null) bar = { value: coursePct, label: t("dashboard.courseProgress") };

  return (
    <HeroCard course style={courseStyle(course.id)} className={className} aria-labelledby="dashboard-resume">
      <div className="flex h-full items-center gap-8">
        <div className="min-w-0 flex-1">
          <span className={chipClass}>
            <Sparkles size={14} aria-hidden />
            {t("dashboard.pickUp")}
          </span>
          <p className="mt-4 truncate text-sm font-medium">
            {item ? `${course.shortname} · ${course.fullname}` : course.shortname}
          </p>
          <h2 id="dashboard-resume" className="mt-1 line-clamp-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {item ? item.name : course.fullname}
          </h2>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {meta && TypeIcon && (
              <span className="inline-flex items-center gap-1.5">
                <TypeIcon size={16} aria-hidden />
                {t(meta.labelKey)}
              </span>
            )}
            {scorm && (
              <span className="inline-flex items-center gap-1.5">
                <Clock size={16} aria-hidden />
                {scorm.seconds > 0
                  ? t("dashboard.scormLearned", { pct: scorm.percent, time: formatDuration(scorm.seconds, t) })
                  : t("dashboard.scormLearnedPct", { pct: scorm.percent })}
              </span>
            )}
            {!!openedAt && <span>{t("dashboard.lastOpened", { time: timeAgo(openedAt, locale) })}</span>}
          </div>
          {scormLoading && <div aria-hidden className="mt-5 h-5 max-w-md animate-pulse rounded-full bg-white/15" />}
          {bar && (
            <div className="mt-5 flex max-w-md items-center gap-3">
              <Progress value={bar.value} tone="white" size="lg" trackClassName="bg-white/25" label={bar.label} className="flex-1" />
              <span className="text-sm font-bold tabular-nums">{Math.round(bar.value)}%</span>
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href={href} variant="light" size="lg">
              <Play size={16} fill="currentColor" strokeWidth={0} aria-hidden />
              {staff ? t("courses.resume") : t("nav.continue")}
            </Button>
            {item && (
              <Link href={`/courses/${course.id}`} className={ghostClass}>
                {t("dashboard.viewCourse")}
              </Link>
            )}
          </div>
        </div>
        <div className="relative hidden w-36 shrink-0 sm:block md:w-44">
          <div className="animate-float">
            <CourseCover course={course} variant="book" className="ring-4 ring-white/30" />
          </div>
          {scorm && coursePct !== null && (
            <p className="absolute -bottom-3 -left-8 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-xl dark:bg-surface dark:text-fg">
              {t("dashboard.courseProgressChip", { pct: coursePct })}
            </p>
          )}
        </div>
      </div>
    </HeroCard>
  );
}

type EmptyHeroState = "noActivity" | "noCourses" | "error";

/** Banner when there is nothing to resume: nothing opened yet, no courses, or the course list failed. */
export function ResumeHeroEmpty({
  state,
  onRetry,
  className,
}: {
  state: EmptyHeroState;
  onRetry: () => void;
  className?: string;
}) {
  const t = useT();
  const copy = {
    noActivity: { title: t("dashboard.emptyTitle"), hint: t("dashboard.emptyHint") },
    noCourses: { title: t("dashboard.noCoursesTitle"), hint: t("dashboard.noCoursesHint") },
    error: { title: t("common.errorTitle"), hint: null },
  }[state];
  const error = state === "error";
  return (
    <HeroCard className={className} aria-labelledby="dashboard-resume">
      {!error && (
        <span className={cn(chipClass, "mb-4")}>
          <Sparkles size={14} aria-hidden />
          {t("dashboard.emptyChip")}
        </span>
      )}
      <div role={error ? "alert" : undefined}>
        <h2 id="dashboard-resume" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {copy.title}
        </h2>
        {copy.hint && <p className="mt-2 max-w-lg text-[15px]">{copy.hint}</p>}
      </div>
      {error ? (
        <Button variant="light" size="lg" className="mt-6" onClick={onRetry}>
          <RotateCw size={16} aria-hidden />
          {t("common.retry")}
        </Button>
      ) : (
        <Button href="/courses" variant="light" size="lg" className="mt-6">
          <BookOpen size={16} aria-hidden />
          {t("nav.courses")}
        </Button>
      )}
    </HeroCard>
  );
}

export function ResumeHeroSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-8 rounded-hero border border-line/60 bg-surface p-6 sm:p-8 dark:border-line", className)}>
      <div className="flex-1 space-y-4">
        <Skeleton className="h-6 w-48 rounded-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-8 w-4/5" />
        <Skeleton className="h-2.5 w-full max-w-md rounded-full" />
        <Skeleton className="h-12 w-40 rounded-2xl" />
      </div>
      <Skeleton className="hidden aspect-[3/4] w-36 shrink-0 sm:block md:w-44" />
    </div>
  );
}
