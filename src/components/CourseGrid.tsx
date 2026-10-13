"use client";
import { useState } from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { useT, useLocale } from "@/i18n/I18nProvider";
import { Badge, Card, EmptyState, FallbackImg, Progress, cn } from "@/components/ui";
import { initials } from "@/lib/format";
import type { TimelineCourse } from "@/lib/moodle/types";

/** Soft two-stop gradients for courses without a (loadable) image. */
const PLACEHOLDERS = [
  "from-[#1e3a8a] to-[#0ea5e9]",
  "from-[#0369a1] to-[#22d3ee]",
  "from-[#4338ca] to-[#a78bfa]",
  "from-[#047857] to-[#38bdf8]",
  "from-[#b45309] to-[#f59e0b]",
  "from-[#be185d] to-[#f472b6]",
];

/** Moodle returns Unix seconds; 0 means "not set". */
function formatDate(unix: number | undefined, locale: string) {
  if (!unix || unix <= 0) return null;
  return new Date(unix * 1000).toLocaleDateString(
    locale === "vi" ? "vi-VN" : "en-US",
    { day: "2-digit", month: "short", year: "numeric" }
  );
}

type Status = "inProgress" | "completed" | "upcoming";

function courseStatus(c: TimelineCourse, pct: number | null): Status {
  if (pct !== null && pct >= 100) return "completed";
  if (c.startdate && c.startdate > Date.now() / 1000) return "upcoming";
  return "inProgress";
}

/**
 * Course cover: Moodle image, or a colored initials tile when missing/unloadable.
 * Wide images fill the frame; portrait/square ones (book-cover style course
 * images are common) are shown whole over a blurred copy instead of cropped.
 */
export function CourseThumb({ course, className }: { course: TimelineCourse; className?: string }) {
  const [tall, setTall] = useState(false);
  const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    setTall(!!h && w / h < 1.3);
  };
  return (
    <div className={cn("relative overflow-hidden bg-surface-2", className)}>
      {tall && course.courseimage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={course.courseimage}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-2xl"
        />
      )}
      <FallbackImg
        src={course.courseimage}
        onLoad={onLoad}
        className={cn(
          "relative h-full w-full",
          tall ? "object-contain py-2 drop-shadow-md" : "object-cover"
        )}
        fallback={
          <div
            className={cn(
              "relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br",
              PLACEHOLDERS[course.id % PLACEHOLDERS.length]
            )}
          >
            {/* Decorative rings so the tile isn't a flat block. */}
            <span className="absolute -right-8 -top-8 h-32 w-32 rounded-full border-[18px] border-white/10" />
            <span className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/10" />
            <span className="relative text-3xl font-semibold tracking-tight text-white/90 drop-shadow-sm">
              {initials(course.fullname || course.shortname)}
            </span>
          </div>
        }
      />
    </div>
  );
}

export function CourseGrid({
  courses,
  layout = "grid",
}: {
  courses: TimelineCourse[];
  layout?: "grid" | "list";
}) {
  const t = useT();
  const { locale } = useLocale();

  if (!courses.length) {
    return (
      <Card>
        <EmptyState icon={GraduationCap} title={t("courses.noCourses")} />
      </Card>
    );
  }

  const list = layout === "list";

  return (
    <div
      className={
        list
          ? "space-y-3"
          : "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      }
    >
      {courses.map((c) => {
        const pct = typeof c.progress === "number" ? Math.round(c.progress) : null;
        const status = courseStatus(c, pct);
        const startDate = formatDate(c.startdate, locale);
        const endDate = formatDate(c.enddate, locale);
        const dates = [startDate, endDate].filter(Boolean).join(" – ");

        const badge =
          status === "completed" ? (
            <Badge tone="success">{t("courses.completed")}</Badge>
          ) : status === "upcoming" ? (
            <Badge tone="neutral">{t("courses.upcoming")}</Badge>
          ) : (
            <Badge tone="primary">{t("courses.inProgress")}</Badge>
          );

        const progress = pct !== null && (
          <div className="flex items-center gap-3">
            <Progress
              value={pct}
              tone={status === "completed" ? "success" : "primary"}
              className="flex-1"
            />
            <span className="w-9 text-right text-xs tabular-nums text-muted">
              {pct}%
            </span>
          </div>
        );

        return (
          <Link
            key={c.id}
            href={`/courses/${c.id}`}
            className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Card
              interactive
              className={cn(
                "h-full overflow-hidden",
                list && "flex items-stretch"
              )}
            >
              <CourseThumb
                course={c}
                className={
                  list
                    ? "aspect-video w-28 shrink-0 border-r border-line sm:w-44"
                    : "aspect-video w-full border-b border-line"
                }
              />
              <div
                className={cn(
                  "flex min-w-0 flex-1 flex-col gap-3 p-4",
                  list && "justify-center"
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-xs text-subtle">{c.shortname}</p>
                  <h3 className="mt-0.5 line-clamp-2 text-sm font-medium text-fg">
                    {c.fullname}
                  </h3>
                </div>
                {progress}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {badge}
                  {dates && (
                    <span className="text-xs tabular-nums text-subtle">{dates}</span>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
