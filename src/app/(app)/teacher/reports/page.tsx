"use client";
import { useState } from "react";
import { Empty, Table } from "antd";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { QueryState } from "@/components/ui/QueryState";
import { CourseSelect } from "@/components/CourseSelect";
import { MaterialIcon } from "@/components/MaterialIcon";
import { MOODLE_BASE } from "@/lib/public-config";

interface EnrolledUser {
  id: number;
  fullname: string;
  email?: string;
  roles?: { shortname: string }[];
  lastcourseaccess?: number;
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-surface-container-lowest p-4 card-elevation">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container/10 text-primary">
        <MaterialIcon name={icon} fill />
      </div>
      <div>
        <p className="text-[22px] font-bold text-on-surface">{value}</p>
        <p className="font-label-md text-label-md text-outline">{label}</p>
      </div>
    </div>
  );
}

export default function TeacherReportsPage() {
  const t = useT();
  const [courseid, setCourseid] = useState<number>();

  const { data, loading, error } = useMoodle<EnrolledUser[]>(
    "core_enrol_get_enrolled_users",
    { courseid: courseid ?? 0 },
    courseid === undefined
  );

  const users = data ?? [];
  const students = users.filter((u) =>
    u.roles?.some((r) => r.shortname === "student")
  );

  return (
    <div className="space-y-gutter">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container/10 text-primary">
          <MaterialIcon name="monitoring" fill />
        </div>
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">
            {t("nav.reports")}
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {t("reports.subtitle")}
          </p>
        </div>
      </div>

      <CourseSelect value={courseid} onChange={setCourseid} />

      {courseid === undefined ? (
        <div className="rounded-xl bg-surface-container-lowest p-lg card-elevation">
          <Empty description={t("reports.selectCourse")} />
        </div>
      ) : (
        <QueryState loading={loading} error={error}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard icon="group" label={t("reports.enrolledUsers")} value={users.length} />
            <StatCard icon="school" label={t("reports.students")} value={students.length} />
            <a
              href={`${MOODLE_BASE}/grade/report/grader/index.php?id=${courseid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-primary-container/10 p-4 font-bold text-primary transition-colors hover:bg-primary-container/20 card-elevation"
            >
              <MaterialIcon name="open_in_new" />
              {t("reports.openGrader")}
            </a>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl bg-surface-container-lowest p-1 card-elevation">
            <Table<EnrolledUser>
              rowKey="id"
              dataSource={users}
              pagination={{ pageSize: 15 }}
              scroll={{ x: true }}
              columns={[
                { title: t("reports.name"), dataIndex: "fullname" },
                { title: t("reports.email"), dataIndex: "email" },
                {
                  title: t("reports.roles"),
                  render: (_, u) =>
                    u.roles?.map((r) => r.shortname).join(", ") || "—",
                },
                {
                  title: t("reports.lastAccess"),
                  render: (_, u) =>
                    u.lastcourseaccess
                      ? new Date(u.lastcourseaccess * 1000).toLocaleDateString()
                      : t("reports.never"),
                },
              ]}
            />
          </div>
        </QueryState>
      )}
    </div>
  );
}
