"use client";
import { useMemo, useState } from "react";
import { Segmented } from "antd";
import { LayoutGrid, List, Search } from "lucide-react";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { Input, PageHeader, QueryState, Skeleton, Tabs } from "@/components/ui";
import { CourseGrid } from "@/components/CourseGrid";
import type { TimelineCourse } from "@/lib/moodle/types";

type Filter = "all" | "ongoing" | "completed";
type Layout = "grid" | "list";

/** A course counts as completed only when Moodle reports 100% progress. */
function isCompleted(c: TimelineCourse) {
  return typeof c.progress === "number" && Math.round(c.progress) === 100;
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-line bg-surface">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-1.5 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CoursesPage() {
  const t = useT();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [layout, setLayout] = useState<Layout>("grid");

  const { data, loading, error } = useMoodle<{ courses: TimelineCourse[] }>(
    "core_course_get_enrolled_courses_by_timeline_classification",
    { classification: "all", limit: 0, offset: 0, sort: "fullname" }
  );

  const courses = useMemo(() => data?.courses ?? [], [data]);
  const ongoingCount = useMemo(
    () => courses.filter((c) => !isCompleted(c)).length,
    [courses]
  );
  const completedCount = courses.length - ongoingCount;

  const visible = useMemo(() => {
    let list = courses;
    if (filter === "completed") list = list.filter(isCompleted);
    else if (filter === "ongoing") list = list.filter((c) => !isCompleted(c));
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.fullname.toLowerCase().includes(q) ||
          c.shortname.toLowerCase().includes(q)
      );
    }
    return list;
  }, [courses, filter, query]);

  const tabs = [
    { key: "all" as const, label: t("courses.filterAll"), count: courses.length },
    { key: "ongoing" as const, label: t("courses.filterOngoing"), count: ongoingCount },
    { key: "completed" as const, label: t("courses.filterCompleted"), count: completedCount },
  ];

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title={t("nav.courses")}
        description={t("courses.activeSubtitle", { count: ongoingCount })}
      />

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <Tabs items={tabs} value={filter} onChange={setFilter} className="lg:flex-1" />
        <div className="flex items-center gap-2">
          <Input
            icon={Search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.filter")}
            aria-label={t("common.filter")}
            wrapperClassName="flex-1 lg:w-64 lg:flex-none"
            className="h-9"
          />
          <Segmented<Layout>
            value={layout}
            onChange={setLayout}
            options={[
              {
                value: "grid",
                icon: <LayoutGrid size={16} strokeWidth={1.75} aria-label={t("common.gridView")} />,
                title: t("common.gridView"),
              },
              {
                value: "list",
                icon: <List size={16} strokeWidth={1.75} aria-label={t("common.listView")} />,
                title: t("common.listView"),
              },
            ]}
          />
        </div>
      </div>

      <QueryState loading={loading} error={error} skeleton={<GridSkeleton />}>
        <CourseGrid courses={visible} layout={layout} />
      </QueryState>
    </div>
  );
}
