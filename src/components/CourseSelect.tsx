"use client";
import { useEffect, useId, useMemo, useState } from "react";
import { Select } from "antd";
import { useT } from "@/i18n/I18nProvider";
import { courseCategory, courseSearchText } from "@/components/courses/lib";
import { byLastAccess, courseStatus, nowSeconds } from "@/lib/courses";
import { foldSearch } from "@/lib/format";
import { useCourseAccess, useEnrolledCourses } from "@/lib/moodle/hooks";

interface CourseOption {
  value: number;
  /** Plain full name: shown in the closed select. */
  label: string;
  /** Short name · class/slot, shown under the name in the list. */
  meta: string;
  search: string;
}

/**
 * Dropdown of the user's enrolled courses, searchable by name, code or
 * class/slot (accent-insensitive). When no course is chosen yet it picks the
 * most recently opened course in progress, else the first course.
 *
 * Without a visible label it is named "Select a course" for screen readers;
 * with one, pass `id` (for `<Label htmlFor>`) or `aria-labelledby` instead.
 */
export function CourseSelect({
  value,
  onChange,
  id,
  "aria-labelledby": labelledBy,
}: {
  value?: number;
  onChange: (courseid: number) => void;
  id?: string;
  "aria-labelledby"?: string;
}) {
  const t = useT();
  const errorId = useId();
  // Shared with the courses page; hidden-in-Moodle courses stay selectable.
  const { courses, loading, error } = useEnrolledCourses("allincludinghidden");
  const { access, loading: accessLoading } = useCourseAccess();
  const [now] = useState(nowSeconds);

  const options = useMemo<CourseOption[]>(
    () =>
      courses.map((c) => ({
        value: c.id,
        label: c.fullname,
        meta: [c.shortname, courseCategory(c)].filter(Boolean).join(" · "),
        search: courseSearchText(c),
      })),
    [courses]
  );

  // An empty page behind an unopened dropdown reads as broken; start somewhere.
  const inProgress = courses.filter((c) => courseStatus(c, now) === "inProgress");
  const first = (byLastAccess(inProgress, access)[0] ?? courses[0])?.id;
  useEffect(() => {
    if (value === undefined && !accessLoading && first !== undefined) onChange(first);
  }, [value, accessLoading, first, onChange]);

  return (
    <>
      <Select<number, CourseOption>
        id={id}
        aria-label={id || labelledBy ? undefined : t("common.selectCourse")}
        aria-labelledby={labelledBy}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="w-full min-w-64 sm:w-72"
        placeholder={error ? t("common.errorTitle") : t("common.selectCourse")}
        status={error ? "error" : undefined}
        title={error ?? undefined}
        loading={loading}
        value={value}
        onChange={onChange}
        options={options}
        notFoundContent={loading ? t("common.loading") : t("courses.noCourses")}
        showSearch={{
          filterOption: (input, option) => !!option && option.search.includes(foldSearch(input)),
        }}
        optionRender={({ data }) => (
          <div className="min-w-0 whitespace-normal py-0.5" title={data.label}>
            <div className="line-clamp-2 text-sm font-medium leading-snug">{data.label}</div>
            {data.meta && <div className="truncate text-xs text-subtle">{data.meta}</div>}
          </div>
        )}
      />
      {/* The red border, placeholder and tooltip are visual only; this names the error for screen readers. */}
      {error && (
        <span id={errorId} className="sr-only">
          {t("common.errorTitle")}. {error}
        </span>
      )}
    </>
  );
}
