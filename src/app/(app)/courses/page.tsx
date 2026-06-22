"use client";
import { useMemo, useState } from "react";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { QueryState } from "@/components/ui/QueryState";
import { CourseGrid } from "@/components/CourseGrid";
import type { TimelineCourse } from "@/lib/moodle/types";

type Filter = "all" | "ongoing" | "completed";

/** A course counts as completed only when Moodle reports 100% progress. */
function isCompleted(c: TimelineCourse) {
  return typeof c.progress === "number" && Math.round(c.progress) === 100;
}

export default function CoursesPage() {
  const t = useT();
  const [filter, setFilter] = useState<Filter>("all");

  const { data, loading, error } = useMoodle<{ courses: TimelineCourse[] }>(
    "core_course_get_enrolled_courses_by_timeline_classification",
    { classification: "all", limit: 0, offset: 0, sort: "fullname" }
  );

  const courses = useMemo(() => data?.courses ?? [], [data]);
  const ongoingCount = useMemo(
    () => courses.filter((c) => !isCompleted(c)).length,
    [courses]
  );

  const visible = useMemo(() => {
    if (filter === "completed") return courses.filter(isCompleted);
    if (filter === "ongoing") return courses.filter((c) => !isCompleted(c));
    return courses;
  }, [courses, filter]);

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: t("courses.filterAll") },
    { key: "ongoing", label: t("courses.filterOngoing") },
    { key: "completed", label: t("courses.filterCompleted") },
  ];

  return (
    <div className="space-y-lg">
      {/* Header & Filters */}
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h2 className="font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
            {t("nav.courses")}
          </h2>
          <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
            {t("courses.activeSubtitle", { count: ongoingCount })}
          </p>
        </div>

        <div className="flex w-full items-center gap-1 rounded-xl border border-surface-container bg-surface-container-low p-1 md:w-auto md:gap-2 md:self-auto md:p-1.5">
          {tabs.map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                aria-pressed={active}
                className={`flex-1 rounded-lg px-2 py-1.5 text-center font-label-md text-[11px] uppercase transition-all md:flex-none md:px-6 md:py-2 md:text-label-md ${
                  active
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <QueryState loading={loading} error={error}>
        <CourseGrid courses={visible} />
      </QueryState>
    </div>
  );
}
