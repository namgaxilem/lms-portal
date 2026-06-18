"use client";
import { useState } from "react";
import { Empty } from "antd";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { QueryState } from "@/components/ui/QueryState";
import { CourseSelect } from "@/components/CourseSelect";
import { MaterialIcon } from "@/components/MaterialIcon";
import type { AssignmentsResult } from "@/lib/moodle/types";
import { MOODLE_BASE } from "@/lib/public-config";

export default function TeacherGradingPage() {
  const t = useT();
  const [courseid, setCourseid] = useState<number>();

  const due = (ts: number) =>
    ts ? new Date(ts * 1000).toLocaleDateString() : "—";

  const { data, loading, error } = useMoodle<AssignmentsResult>(
    "mod_assign_get_assignments",
    { courseids: courseid ? [courseid] : [] },
    courseid === undefined
  );

  const assignments = data?.courses?.flatMap((c) => c.assignments) ?? [];

  return (
    <div className="space-y-gutter">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container/10 text-primary">
          <MaterialIcon name="fact_check" fill />
        </div>
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">
            {t("nav.grading")}
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {t("grading.subtitle")}
          </p>
        </div>
      </div>

      <CourseSelect value={courseid} onChange={setCourseid} />

      {courseid === undefined ? (
        <div className="rounded-xl bg-surface-container-lowest p-lg card-elevation">
          <Empty description={t("grading.selectCourse")} />
        </div>
      ) : (
        <QueryState loading={loading} error={error}>
          {assignments.length === 0 ? (
            <div className="rounded-xl bg-surface-container-lowest p-lg card-elevation">
              <Empty description={t("grading.noAssignments")} />
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((a, i) => (
                <div
                  key={a.id}
                  style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                  className="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-4 card-elevation animate-fade-in-up sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container/10 text-primary">
                      <MaterialIcon name="assignment" />
                    </div>
                    <div>
                      <h5 className="font-body-md font-bold text-on-surface">
                        {a.name}
                      </h5>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-surface-container px-2.5 py-0.5 font-semibold text-on-surface-variant">
                          {t("grading.due")}: {due(a.duedate)}
                        </span>
                        <span className="rounded-full bg-primary-container/10 px-2.5 py-0.5 font-semibold text-primary">
                          {t("grading.max")} {a.grade}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <a
                      href={`${MOODLE_BASE}/mod/assign/view.php?id=${a.cmid}&action=grading`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary transition-opacity hover:opacity-90 active:scale-95"
                    >
                      <MaterialIcon name="edit" className="!text-base" />
                      {t("grading.grade")}
                    </a>
                    <a
                      href={`${MOODLE_BASE}/mod/assign/view.php?id=${a.cmid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-lg border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface transition-colors hover:border-primary hover:text-primary"
                    >
                      <MaterialIcon name="open_in_new" className="!text-base" />
                      {t("common.open")}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </QueryState>
      )}
    </div>
  );
}
