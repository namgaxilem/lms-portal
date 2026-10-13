"use client";
import { useState } from "react";
import { Table } from "antd";
import {
  BarChart3,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Trophy,
  Users,
} from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { CourseSelect } from "@/components/CourseSelect";
import { UserAvatar } from "@/components/UserAvatar";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  QueryState,
  StatCard,
  type Tone,
} from "@/components/ui";
import { accountRole, isStaffRole, stripHtml } from "@/lib/format";
import type { GradeItem, UserGrades } from "@/lib/moodle/types";
import { MOODLE_BASE } from "@/lib/public-config";

interface EnrolledUser {
  id: number;
  fullname: string;
  email?: string;
  roles?: { shortname: string }[];
  lastcourseaccess?: number;
}

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

/** Teacher / admin view — course participation overview. */
function TeacherReport({ courseid }: { courseid: number }) {
  const t = useT();
  const { user } = useSession();
  const { data, loading, error } = useMoodle<EnrolledUser[]>(
    "core_enrol_get_enrolled_users",
    { courseid }
  );

  const users = data ?? [];
  const students = users.filter((u) =>
    u.roles?.some((r) => r.shortname === "student")
  );

  return (
    <QueryState loading={loading} error={error}>
      <div className="space-y-6 animate-fade-in-up">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard
            icon={Users}
            label={t("reports.enrolledUsers")}
            value={users.length}
          />
          <StatCard
            icon={GraduationCap}
            label={t("reports.students")}
            value={students.length}
          />
          {user.isSiteAdmin && (
            <div className="col-span-2 flex items-center sm:col-span-1 sm:justify-end">
              <Button
                variant="secondary"
                href={`${MOODLE_BASE}/grade/report/grader/index.php?id=${courseid}`}
                external
                className="w-full sm:w-auto"
              >
                <ExternalLink size={16} strokeWidth={1.75} />
                {t("reports.openGrader")}
              </Button>
            </div>
          )}
        </div>

        {users.length === 0 ? (
          <Card>
            <EmptyState icon={Users} title={t("reports.noUsers")} />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <Table<EnrolledUser>
              rowKey="id"
              size="middle"
              bordered={false}
              dataSource={users}
              pagination={{ pageSize: 15, hideOnSinglePage: true }}
              scroll={{ x: true }}
              columns={[
                {
                  title: t("reports.name"),
                  dataIndex: "fullname",
                  render: (_, u) => (
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar name={u.fullname} id={u.id} size={28} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-fg">
                          {u.fullname}
                        </p>
                        {u.email && (
                          <p className="truncate text-xs text-subtle">{u.email}</p>
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  title: t("reports.roles"),
                  render: (_, u) =>
                    u.roles && u.roles.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <Badge
                            key={r.shortname}
                            tone={r.shortname === "student" ? "neutral" : "primary"}
                          >
                            {r.shortname}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-subtle">—</span>
                    ),
                },
                {
                  title: t("reports.lastAccess"),
                  render: (_, u) => (
                    <span className="whitespace-nowrap text-[13px] tabular-nums text-subtle">
                      {u.lastcourseaccess
                        ? new Date(u.lastcourseaccess * 1000).toLocaleDateString()
                        : t("reports.never")}
                    </span>
                  ),
                },
              ]}
            />
          </Card>
        )}
      </div>
    </QueryState>
  );
}

/** Student view — the current user's own grade report for the course. */
function StudentReport({ courseid, userid }: { courseid: number; userid: number }) {
  const t = useT();
  const { data, loading, error } = useMoodle<UserGrades>(
    "gradereport_user_get_grade_items",
    { courseid, userid }
  );

  const items = data?.usergrades?.[0]?.gradeitems ?? [];
  const total = items.find((i) => i.itemtype === "course");
  const graded = items.filter((i) => i.itemtype === "mod");

  return (
    <QueryState loading={loading} error={error}>
      <div className="space-y-6 animate-fade-in-up">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard
            icon={Trophy}
            label={t("reports.courseTotal")}
            value={total?.percentageformatted || total?.gradeformatted || "—"}
          />
          <StatCard
            icon={CheckCircle2}
            label={t("reports.subtitleStudent")}
            value={graded.length}
          />
        </div>

        {items.length === 0 ? (
          <Card>
            <EmptyState icon={BarChart3} title={t("reports.noGrades")} />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <Table<GradeItem>
              rowKey="id"
              size="middle"
              bordered={false}
              pagination={false}
              dataSource={items}
              scroll={{ x: true }}
              rowClassName={(r) =>
                r.itemtype === "course" ? "font-semibold [&>td]:bg-surface-2" : ""
              }
              columns={[
                {
                  title: t("grades.item"),
                  dataIndex: "itemname",
                  render: (v: string | null, r) => (
                    <span className="text-fg">
                      {v ||
                        (r.itemtype === "course" ? t("reports.courseTotal") : "—")}
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
      </div>
    </QueryState>
  );
}

export default function ReportsPage() {
  const { user } = useSession();
  const t = useT();
  const [courseid, setCourseid] = useState<number>();

  const isStaff = isStaffRole(accountRole(user));

  return (
    <div>
      <PageHeader
        title={t("nav.reports")}
        description={isStaff ? t("reports.subtitle") : t("reports.subtitleStudent")}
        actions={<CourseSelect value={courseid} onChange={setCourseid} />}
      />

      {courseid === undefined ? (
        <Card>
          <EmptyState
            icon={BarChart3}
            title={
              isStaff
                ? t("reports.selectCourse")
                : t("reports.selectCourseStudent")
            }
          />
        </Card>
      ) : isStaff ? (
        <TeacherReport courseid={courseid} />
      ) : (
        <StudentReport courseid={courseid} userid={user.id} />
      )}
    </div>
  );
}
