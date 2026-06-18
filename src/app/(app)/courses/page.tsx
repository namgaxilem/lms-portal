"use client";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { QueryState } from "@/components/ui/QueryState";
import { CourseGrid } from "@/components/CourseGrid";
import { MaterialIcon } from "@/components/MaterialIcon";
import type { TimelineCourse } from "@/lib/moodle/types";

export default function CoursesPage() {
  const t = useT();
  const { data, loading, error } = useMoodle<{ courses: TimelineCourse[] }>(
    "core_course_get_enrolled_courses_by_timeline_classification",
    { classification: "all", limit: 0, offset: 0, sort: "fullname" }
  );

  return (
    <div className="space-y-gutter">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container/10 text-primary">
          <MaterialIcon name="school" fill />
        </div>
        <h2 className="font-headline-md text-headline-md text-on-surface">
          {t("nav.courses")}
        </h2>
      </div>
      <QueryState loading={loading} error={error}>
        <CourseGrid courses={data?.courses ?? []} />
      </QueryState>
    </div>
  );
}
