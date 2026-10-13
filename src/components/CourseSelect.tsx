"use client";
import { useEffect } from "react";
import { Select } from "antd";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import type { TimelineCourse } from "@/lib/moodle/types";

/** Dropdown of the user's enrolled courses. Picks the first one if none is chosen. */
export function CourseSelect({
  value,
  onChange,
}: {
  value?: number;
  onChange: (courseid: number) => void;
}) {
  const t = useT();
  const { data, loading } = useMoodle<{ courses: TimelineCourse[] }>(
    "core_course_get_enrolled_courses_by_timeline_classification",
    { classification: "all", limit: 0, offset: 0, sort: "fullname" }
  );

  // An empty page behind an unopened dropdown reads as broken; start somewhere.
  const first = data?.courses[0]?.id;
  useEffect(() => {
    if (value === undefined && first !== undefined) onChange(first);
  }, [value, first, onChange]);

  return (
    <Select
      className="w-full min-w-64 sm:w-72"
      placeholder={t("common.selectCourse")}
      loading={loading}
      value={value}
      onChange={onChange}
      showSearch
      optionFilterProp="label"
      options={(data?.courses ?? []).map((c) => ({
        value: c.id,
        label: c.fullname,
      }))}
    />
  );
}
