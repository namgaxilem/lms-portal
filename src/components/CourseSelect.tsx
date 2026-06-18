"use client";
import { Select } from "antd";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import type { TimelineCourse } from "@/lib/moodle/types";

/** Dropdown of the user's enrolled courses. */
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

  return (
    <Select
      className="w-full max-w-md"
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
