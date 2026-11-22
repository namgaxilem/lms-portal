"use client";
import { Select } from "antd";
import { useT } from "@/i18n/I18nProvider";
import { foldSearch } from "@/lib/format";
import type { GradableCourse } from "./useGradableCourses";

interface Option {
  value: number;
  label: string;
  category?: string;
  count: number;
  search: string;
}

/** Searchable course dropdown: name, category (class / slot) and assignment count. */
export function GradingCoursePicker({
  courses,
  value,
  onChange,
}: {
  courses: GradableCourse[];
  value?: number;
  onChange: (courseid: number) => void;
}) {
  const t = useT();
  const options: Option[] = courses.map((c) => ({
    value: c.id,
    label: c.fullname,
    category: c.category,
    count: c.assignments.length,
    search: foldSearch(`${c.fullname} ${c.shortname} ${c.category ?? ""}`),
  }));

  return (
    <Select<number, Option>
      className="w-full sm:w-80"
      aria-label={t("common.selectCourse")}
      placeholder={t("common.selectCourse")}
      value={value}
      onChange={onChange}
      options={options}
      showSearch={{ filterOption: (input, option) => !!option?.search.includes(foldSearch(input)) }}
      optionRender={({ data }) => (
        <div className="flex items-center gap-3 py-0.5">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{data.label}</p>
            {data.category && <p className="truncate text-xs text-subtle">{data.category}</p>}
          </div>
          <span
            className="shrink-0 rounded-full bg-surface-2 px-2 text-xs font-semibold tabular-nums text-muted"
            title={t("grading.assignmentTotal", { n: data.count })}
          >
            <span aria-hidden>{data.count}</span>
            <span className="sr-only">{t("grading.assignmentTotal", { n: data.count })}</span>
          </span>
        </div>
      )}
    />
  );
}
