"use client";
import { useMemo, useState } from "react";
import { Inbox, Search, SearchX } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Button, Card, EmptyState, Input, PageHeader, QueryState, Skeleton, Tabs, tabPanelProps } from "@/components/ui";
import { CourseGrid, CourseGridSkeleton } from "@/components/CourseGrid";
import { ViewToggle, useCourseView } from "@/components/courses/ViewToggle";
import { COURSE_STATUSES, STATUS_META, courseSearchText } from "@/components/courses/lib";
import { courseStatus, nowSeconds, type CourseStatus } from "@/lib/courses";
import { foldSearch } from "@/lib/format";
import { useCourseAccess, useCourseDetails, useEnrolledCourses } from "@/lib/moodle/hooks";

type Filter = "all" | CourseStatus;

const TABS_ID = "courses";

/** Nothing to show in the current tab: either the search matches nothing, or the status group is empty. */
function FilteredEmpty({ searching, status, onClear }: { searching: boolean; status?: string; onClear: () => void }) {
  const t = useT();
  return (
    <Card>
      <EmptyState
        icon={searching ? SearchX : Inbox}
        title={searching ? t("courses.noMatch") : t("courses.emptyStatus", { status: status ?? "" })}
        hint={searching ? t("courses.noMatchHint") : t("courses.emptyStatusHint")}
        action={
          <Button variant="secondary" size="md" onClick={onClear}>
            {t("courses.clearFilters")}
          </Button>
        }
      />
    </Card>
  );
}

export default function CoursesPage() {
  const t = useT();
  // "allincludinghidden": courses hidden in Moodle's My courses block stay listed.
  const { courses, loading, error } = useEnrolledCourses("allincludinghidden");
  const ids = useMemo(() => courses.map((c) => c.id), [courses]);
  const { byId: details } = useCourseDetails(ids);
  const { access: lastAccess } = useCourseAccess();

  const [now] = useState(nowSeconds);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useCourseView();

  const statusById = useMemo(
    () => new Map(courses.map((c) => [c.id, courseStatus(c, now)])),
    [courses, now]
  );
  const activeTotal = useMemo(
    () => [...statusById.values()].filter((s) => s === "inProgress").length,
    [statusById]
  );

  const q = foldSearch(query);
  const matching = useMemo(
    () => (q ? courses.filter((c) => courseSearchText(c, details.get(c.id)).includes(q)) : courses),
    [courses, details, q]
  );

  // Tab counts follow the search, so a tab never promises courses it won't show.
  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: matching.length, inProgress: 0, upcoming: 0, completed: 0, ended: 0 };
    for (const c of matching) {
      const status = statusById.get(c.id);
      if (status) result[status]++;
    }
    return result;
  }, [matching, statusById]);

  const visible = useMemo(
    () => (filter === "all" ? matching : matching.filter((c) => statusById.get(c.id) === filter)),
    [filter, matching, statusById]
  );

  const ready = !loading && !error;
  const tabs = [
    { key: "all" as const, label: t("courses.filterAll"), count: ready ? counts.all : undefined },
    ...COURSE_STATUSES.map((key) => ({
      key,
      label: t(STATUS_META[key].labelKey),
      count: ready ? counts[key] : undefined,
    })),
  ];
  const activeLabel = tabs.find((tab) => tab.key === filter)?.label;

  const clearFilters = () => {
    setFilter("all");
    setQuery("");
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title={t("nav.courses")}
        description={
          loading ? (
            <Skeleton className="h-5 w-56 max-w-full" />
          ) : ready && courses.length > 0 ? (
            t("courses.summary", { active: activeTotal, total: courses.length })
          ) : undefined
        }
        actions={
          <>
            <Input
              type="search"
              icon={Search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("courses.searchPlaceholder")}
              aria-label={t("courses.searchPlaceholder")}
              wrapperClassName="min-w-0 flex-1 sm:w-64 sm:flex-none lg:w-72"
            />
            <ViewToggle value={view} onChange={setView} />
          </>
        }
      />

      <Tabs
        id={TABS_ID}
        aria-label={t("courses.statusFilter")}
        items={tabs}
        value={filter}
        onChange={setFilter}
        className="mb-6"
      />

      <div
        {...tabPanelProps(TABS_ID, filter)}
        className="rounded-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <h2 className="sr-only">{activeLabel}</h2>
        <QueryState loading={loading} error={error} skeleton={<CourseGridSkeleton view={view} />}>
          {courses.length > 0 && visible.length === 0 ? (
            <FilteredEmpty searching={!!q} status={activeLabel} onClear={clearFilters} />
          ) : (
            <CourseGrid courses={visible} view={view} details={details} lastAccess={lastAccess} now={now} />
          )}
        </QueryState>
      </div>
    </div>
  );
}
