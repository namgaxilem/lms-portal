"use client";
import { useState } from "react";
import { Table } from "antd";
import { GraduationCap } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { CourseSelect } from "@/components/CourseSelect";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  QueryState,
  type Tone,
} from "@/components/ui";
import { stripHtml } from "@/lib/format";
import type { GradeItem, UserGrades } from "@/lib/moodle/types";

/** Numeric percentage for a grade item, or null when ungraded. */
function percentOf(item: GradeItem): number | null {
  const parsed = parseFloat(item.percentageformatted);
  if (!Number.isNaN(parsed)) return parsed;
  if (item.graderaw != null && item.grademax > item.grademin) {
    return ((item.graderaw - item.grademin) / (item.grademax - item.grademin)) * 100;
  }
  return null;
}

function percentTone(p: number | null): Tone {
  if (p == null) return "neutral";
  if (p >= 80) return "success";
  if (p >= 50) return "primary";
  return "warning";
}

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
    <div>
      <PageHeader
        title={t("nav.grades")}
        actions={<CourseSelect value={courseid} onChange={setCourseid} />}
      />

      {courseid === undefined ? (
        <Card>
          <EmptyState icon={GraduationCap} title={t("grades.selectToView")} />
        </Card>
      ) : (
        <QueryState loading={loading} error={error}>
          {items.length === 0 ? (
            <Card>
              <EmptyState icon={GraduationCap} title={t("reports.noGrades")} />
            </Card>
          ) : (
            <Card className="overflow-hidden animate-fade-in-up">
              <Table<GradeItem>
                rowKey="id"
                size="middle"
                bordered={false}
                pagination={false}
                dataSource={items}
                scroll={{ x: true }}
                rowClassName={(r) =>
                  r.itemtype === "course"
                    ? "font-semibold [&>td]:bg-surface-2"
                    : ""
                }
                columns={[
                  {
                    title: t("grades.item"),
                    dataIndex: "itemname",
                    render: (v: string | null, r) => (
                      <span className="text-fg">
                        {v ||
                          (r.itemtype === "course" ? t("grades.courseTotal") : "—")}
                      </span>
                    ),
                  },
                  {
                    title: t("grades.grade"),
                    dataIndex: "gradeformatted",
                    render: (v: string) => (
                      <span className="tabular-nums text-fg">{v || "—"}</span>
                    ),
                  },
                  {
                    title: t("grades.range"),
                    render: (_, r) => (
                      <span className="tabular-nums text-muted">
                        {r.grademin}–{r.grademax}
                      </span>
                    ),
                  },
                  {
                    title: t("grades.percentage"),
                    render: (_, r) => {
                      const p = percentOf(r);
                      return (
                        <Badge tone={percentTone(p)} className="tabular-nums">
                          {p == null ? "—" : r.percentageformatted || `${p.toFixed(1)} %`}
                        </Badge>
                      );
                    },
                  },
                  {
                    title: t("grades.feedback"),
                    dataIndex: "feedback",
                    render: (v: string) => {
                      const text = v ? stripHtml(v) : "";
                      return (
                        <span className="text-[13px] text-muted">{text || "—"}</span>
                      );
                    },
                  },
                ]}
              />
            </Card>
          )}
        </QueryState>
      )}
    </div>
  );
}
