"use client";
import { CalendarDays, ListTree, Play, RotateCcw } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Button, HeroCard, ProgressRing } from "@/components/ui";
import { CourseCover } from "@/components/CourseCover";
import { courseStyle } from "@/lib/course-color";
import { formatDate, initials } from "@/lib/format";
import { moduleRoute } from "@/lib/moodle/course-outline";
import type { CourseDetails } from "@/lib/moodle/types";
import { courseImage, type ResumeTarget } from "./lib";

/* Small hero text stays solid white and translucent fills are dark, so it
   keeps 4.5:1 on the course gradient (HeroCard adds a scrim behind text). */

type Contact = NonNullable<CourseDetails["contacts"]>[number];

function Chip({ text }: { text: string }) {
  return (
    <span title={text} className="inline-block max-w-full truncate rounded-full bg-black/20 px-3 py-1 text-xs font-bold">
      {text}
    </span>
  );
}

function Teachers({ contacts }: { contacts: Contact[] }) {
  const t = useT();
  if (!contacts.length) return null;
  const [first, ...rest] = contacts;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/20 text-[11px] font-bold ring-2 ring-white/30"
      >
        {initials(first.fullname)}
      </span>
      <span className="truncate">
        {first.fullname}
        {rest.length > 0 && ` ${t("course.andMore", { n: rest.length })}`}
      </span>
    </span>
  );
}

interface ProgressSummary {
  done: number;
  total: number;
  percent: number | null;
}

function ResumePanel({
  courseid,
  progress,
  unavailable,
  resume,
}: {
  courseid: number;
  progress: ProgressSummary | null;
  unavailable: boolean;
  resume: ResumeTarget | null;
}) {
  const t = useT();
  if (unavailable) return null;
  return (
    <div className="flex shrink-0 items-center gap-4 rounded-3xl bg-black/15 p-4 ring-1 ring-white/20 backdrop-blur-sm md:w-64 md:flex-col md:p-5">
      {progress === null ? (
        <span aria-hidden className="h-[88px] w-[88px] shrink-0 animate-pulse rounded-full bg-white/20" />
      ) : progress.percent !== null ? (
        <ProgressRing value={progress.percent} size={88} stroke={9} tone="white" label={t("course.progressLabel")}>
          <span className="text-center leading-tight">
            <span className="block text-xl font-extrabold tabular-nums">{progress.percent}%</span>
            <span className="block text-xs font-semibold tabular-nums">
              {progress.done}/{progress.total}
            </span>
          </span>
        </ProgressRing>
      ) : (
        <p className="text-sm font-medium md:text-center">{t("course.notTracked")}</p>
      )}
      {resume && (
        <div className="min-w-0 flex-1 md:w-full md:flex-none">
          <Button
            href={moduleRoute(resume.mod, courseid)}
            variant="light"
            size="lg"
            className="w-full"
            aria-describedby="course-resume-target"
          >
            {resume.kind === "review" ? (
              <RotateCcw size={16} aria-hidden className="text-course" />
            ) : (
              <Play size={16} fill="currentColor" aria-hidden className="text-course" />
            )}
            {t(`course.${resume.kind}`)}
          </Button>
          <p id="course-resume-target" className="mt-2 truncate text-xs md:text-center" title={resume.mod.name}>
            {resume.kind === "review" ? resume.mod.name : t("course.nextItem", { name: resume.mod.name })}
          </p>
        </div>
      )}
    </div>
  );
}

/** Course-coloured banner: cover, name, class, dates, teachers, progress and "Continue". */
export function CourseHero({
  courseid,
  course,
  loading,
  progress,
  progressUnavailable,
  counts,
  members,
  resume,
}: {
  courseid: number;
  course: CourseDetails | undefined;
  loading: boolean;
  /** null while the contents load (or when they failed, see progressUnavailable). */
  progress: ProgressSummary | null;
  /** The contents could not be loaded: there is no progress or "Continue" to show. */
  progressUnavailable: boolean;
  counts: { sections: number; activities: number } | null;
  members: number | null;
  resume: ResumeTarget | null;
}) {
  const t = useT();
  const { locale } = useLocale();
  const fullname = course?.fullname ?? (loading ? "" : t("courses.contents"));
  const start = formatDate(course?.startdate, locale);
  const end = formatDate(course?.enddate, locale);

  return (
    <HeroCard course style={courseStyle(courseid)}>
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-7">
        <div className="flex min-w-0 flex-1 items-start gap-4 sm:gap-6">
          <div className="w-20 shrink-0 rounded-xl ring-4 ring-white/25 sm:w-28 lg:w-32">
            {loading ? (
              <div aria-hidden className="aspect-[3/4] animate-pulse rounded-xl bg-white/20" />
            ) : (
              <CourseCover
                course={{ id: courseid, fullname, shortname: course?.shortname, courseimage: courseImage(course) }}
                variant="book"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              {course?.shortname && <Chip text={course.shortname} />}
              {course?.categoryname && <Chip text={course.categoryname} />}
              {members !== null && members > 0 && <Chip text={t("course.membersCount", { n: members })} />}
            </div>
            {fullname ? (
              <h1 className="mt-3 text-xl font-extrabold leading-tight tracking-tight sm:text-3xl">{fullname}</h1>
            ) : (
              <div className="mt-3 space-y-2" aria-hidden>
                <div className="h-7 w-3/4 animate-pulse rounded-xl bg-white/25" />
                <div className="h-7 w-1/2 animate-pulse rounded-xl bg-white/25" />
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <Teachers contacts={course?.contacts ?? []} />
              {start && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={16} aria-hidden />
                  {end ? `${start} – ${end}` : t("course.startsOn", { date: start })}
                </span>
              )}
              {counts && counts.sections > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <ListTree size={16} aria-hidden />
                  {t("course.outlineCount", counts)}
                </span>
              )}
            </div>
          </div>
        </div>
        <ResumePanel courseid={courseid} progress={progress} unavailable={progressUnavailable} resume={resume} />
      </div>
    </HeroCard>
  );
}
