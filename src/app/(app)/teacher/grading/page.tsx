"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Card, EmptyState, PageHeader, QueryState, Skeleton } from "@/components/ui";
import { CourseAssignments } from "@/components/grading/CourseAssignments";
import { GradingCoursePicker } from "@/components/grading/GradingCoursePicker";
import { useGradableCourses } from "@/components/grading/useGradableCourses";

export default function TeacherGradingPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const t = useT();
  const router = useRouter();
  const { course } = use(searchParams);
  const { courses, loading, error } = useGradableCourses();
  // ?course= keeps the selection when coming back from a grading workspace.
  const [picked, setPicked] = useState<number | undefined>(Number(course) || undefined);
  const selected = courses.find((c) => c.id === picked) ?? courses[0];

  const pick = (id: number) => {
    setPicked(id);
    router.replace(`/teacher/grading?course=${id}`, { scroll: false });
  };

  return (
    <div>
      <PageHeader
        eyebrow={t("nav.teaching")}
        title={t("nav.grading")}
        description={t("grading.subtitle")}
        actions={
          courses.length > 0 && <GradingCoursePicker courses={courses} value={selected?.id} onChange={pick} />
        }
      />

      <QueryState
        loading={loading}
        error={error}
        skeleton={
          <div className="space-y-5">
            <Skeleton className="h-28 w-full rounded-card" />
            <Skeleton className="h-72 w-full rounded-card" />
          </div>
        }
      >
        {selected ? (
          <CourseAssignments key={selected.id} course={selected} />
        ) : (
          <Card>
            <EmptyState icon={ClipboardCheck} title={t("grading.noGradableTitle")} hint={t("grading.noGradableHint")} />
          </Card>
        )}
      </QueryState>
    </div>
  );
}
