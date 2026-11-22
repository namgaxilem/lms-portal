"use client";
import { SearchX } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Button, Card, EmptyState } from "@/components/ui";

/** Unknown or inaccessible course: the page heading plus a way back. */
export function CourseNotFound() {
  const t = useT();
  return (
    <Card>
      <EmptyState
        icon={SearchX}
        title={
          <span role="heading" aria-level={1}>
            {t("course.notFound")}
          </span>
        }
        hint={t("course.notFoundHint")}
        action={
          <Button href="/courses" variant="secondary">
            {t("courses.backToCourses")}
          </Button>
        }
      />
    </Card>
  );
}
