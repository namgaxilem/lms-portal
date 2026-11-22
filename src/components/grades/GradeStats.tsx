"use client";
import { BookOpen, CalendarDays, ClipboardCheck, Sparkles } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Skeleton, StatCard } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/format";
import { useCalendarUpcoming } from "@/lib/moodle/hooks";
import type { TimelineCourse } from "@/lib/moodle/types";
import { useCourseGradeReport } from "./useCourseGradeReport";

const pending = <Skeleton className="mt-1 h-8 w-20" />;

/** Items graded and latest grade of the selected course. Mount with `key={course.id}`. */
function SelectedCourseStats({ course }: { course: Pick<TimelineCourse, "id" | "shortname"> }) {
  const t = useT();
  const { locale } = useLocale();
  const { summary, loading, error } = useCourseGradeReport(course.id);
  if (error || (!loading && summary.gradable === 0)) return null;
  const { latest } = summary;

  return (
    <>
      <StatCard
        icon={ClipboardCheck}
        tone="success"
        label={t("grades.stats.itemsGraded")}
        value={loading ? pending : `${summary.graded}/${summary.gradable}`}
        hint={course.shortname}
      />
      {/* Without grading dates there is no "latest" to show, even when items are graded. */}
      {(loading || latest || summary.graded === 0) && (
        <StatCard
          icon={Sparkles}
          tone="violet"
          label={t("grades.stats.latest")}
          value={
            loading ? pending : latest ? (
              // Text grades ("Submitted…", letters) can be long: keep them on one line.
              <span className="block truncate" title={latest.display ?? undefined}>
                {latest.display}
                {latest.max != null && (
                  <span className="text-base font-bold text-subtle"> / {formatNumber(latest.max, locale)}</span>
                )}
              </span>
            ) : (
              "–"
            )
          }
          hint={
            loading
              ? undefined
              : latest?.dateGraded
                ? `${latest.name ?? t("grades.untitledItem")} · ${formatDate(latest.dateGraded, locale)}`
                : t("grades.noGradeYet")
          }
        />
      )}
    </>
  );
}

/** Calendar events in the user's Moodle look-ahead (shared request with /calendar). */
function UpcomingStat() {
  const t = useT();
  const { data, loading, error } = useCalendarUpcoming();
  if (error) return null;
  const count = data?.events.length ?? 0;
  return (
    <StatCard
      icon={CalendarDays}
      tone="warning"
      label={t("calendar.upcoming")}
      value={loading ? pending : count}
      hint={loading ? undefined : count ? t("calendar.upcomingHint") : t("calendar.noUpcoming")}
      href="/calendar"
    />
  );
}

/**
 * Option A's stat row on /grades: graded courses (gradereport_overview),
 * items graded and latest grade of the selected course, upcoming events.
 * A tile whose data is unavailable is left out.
 */
export function GradeStats({
  graded,
  total,
  coursesLoading,
  overviewLoading,
  overviewFailed,
  selected,
}: {
  graded: number;
  total: number;
  coursesLoading: boolean;
  overviewLoading: boolean;
  overviewFailed: boolean;
  selected: Pick<TimelineCourse, "id" | "shortname"> | null;
}) {
  const t = useT();
  const showGraded = !overviewFailed && (coursesLoading || total > 0);
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
      {showGraded && (
        <StatCard
          icon={BookOpen}
          tone="primary"
          label={t("grades.stats.coursesGraded")}
          value={coursesLoading || overviewLoading ? pending : `${graded}/${total}`}
        />
      )}
      {selected && <SelectedCourseStats key={selected.id} course={selected} />}
      <UpcomingStat />
    </div>
  );
}
