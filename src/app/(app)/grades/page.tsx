"use client";
import { useState } from "react";
import { Empty, Table } from "antd";
import { useSession } from "@/components/providers/SessionProvider";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { QueryState } from "@/components/ui/QueryState";
import { CourseSelect } from "@/components/CourseSelect";
import { MaterialIcon } from "@/components/MaterialIcon";
import type { GradeItem, UserGrades } from "@/lib/moodle/types";

export default function GradesPage() {
  const { user } = useSession();
  const t = useT();
  const [courseid, setCourseid] = useState<number>();

  const { data, loading, error } = useMoodle<UserGrades>(
    "gradereport_user_get_grade_items",
    { courseid: courseid ?? 0, userid: user.id },
    courseid === undefined
  );

  const items = data?.usergrades?.[0]?.gradeitems ?? [];

  return (
    <div className="space-y-gutter">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container/10 text-primary">
          <MaterialIcon name="workspace_premium" fill />
        </div>
        <h2 className="font-headline-md text-headline-md text-on-surface">
          {t("nav.grades")}
        </h2>
      </div>

      <CourseSelect value={courseid} onChange={setCourseid} />

      {courseid === undefined ? (
        <div className="rounded-xl bg-surface-container-lowest p-lg card-elevation">
          <Empty description={t("grades.selectToView")} />
        </div>
      ) : (
        <QueryState loading={loading} error={error}>
          <div className="overflow-hidden rounded-xl bg-surface-container-lowest p-1 card-elevation">
            <Table<GradeItem>
              rowKey="id"
              pagination={false}
              dataSource={items}
              scroll={{ x: true }}
              columns={[
                {
                  title: t("grades.item"),
                  dataIndex: "itemname",
                  render: (v: string | null, r) =>
                    v || (r.itemtype === "course" ? t("grades.courseTotal") : "—"),
                },
                { title: t("grades.grade"), dataIndex: "gradeformatted" },
                {
                  title: t("grades.range"),
                  render: (_, r) => `${r.grademin}–${r.grademax}`,
                },
                { title: t("grades.percentage"), dataIndex: "percentageformatted" },
                { title: t("grades.feedback"), dataIndex: "feedback" },
              ]}
            />
          </div>
        </QueryState>
      )}
    </div>
  );
}
