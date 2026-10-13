"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { CourseSelect } from "@/components/CourseSelect";
import { Card, EmptyState, PageHeader, QueryState } from "@/components/ui";
import { AssignmentRow } from "@/components/grading/AssignmentRow";
import type { AssignmentsResult } from "@/lib/moodle/types";

export default function TeacherGradingPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const t = useT();
  const router = useRouter();
  const { course } = use(searchParams);
  // ?course= keeps the selection when coming back from a grading workspace.
  const [courseid, setCourseid] = useState<number | undefined>(Number(course) || undefined);
  const [now] = useState(() => Date.now() / 1000);

  const pickCourse = (id: number) => {
    setCourseid(id);
    router.replace(`/teacher/grading?course=${id}`, { scroll: false });
  };

  const { data, loading, error } = useMoodle<AssignmentsResult>(
    "mod_assign_get_assignments",
    { courseids: courseid ? [courseid] : [] },
    courseid === undefined
  );
  const assignments = data?.courses?.flatMap((c) => c.assignments) ?? [];

  return (
    <div>
      <PageHeader
        title={t("nav.grading")}
        description={t("grading.subtitle")}
        actions={<CourseSelect value={courseid} onChange={pickCourse} />}
      />

      {courseid === undefined ? (
        <Card>
          <EmptyState icon={ClipboardCheck} title={t("grading.selectCourse")} />
        </Card>
      ) : (
        <QueryState loading={loading} error={error}>
          {assignments.length === 0 ? (
            <Card>
              <EmptyState icon={ClipboardCheck} title={t("grading.noAssignments")} />
            </Card>
          ) : (
            <Card className="divide-y divide-line overflow-hidden animate-fade-in-up">
              {assignments.map((a) => (
                <AssignmentRow key={a.id} assignment={a} now={now} courseid={courseid} />
              ))}
            </Card>
          )}
        </QueryState>
      )}
    </div>
  );
}
