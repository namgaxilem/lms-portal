"use client";
import { useEffect } from "react";
import { PackageOpen, RotateCw } from "lucide-react";
import { moodleClient } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { Button, Card, EmptyState, QueryState, RichText, Skeleton } from "@/components/ui";
import type { CourseModuleInfo } from "@/lib/moodle/types";
import { useViewLoggedHandler } from "./course-navigation";

/** The course module being viewed (core_course_get_course_module). */
export type ActivityCm = CourseModuleInfo["cm"];

/** Shared cache lifetime for per-course instance lists (pages, URLs, files). */
export const INSTANCE_CACHE_MS = 60_000;

/**
 * Logs the view in Moodle (mod_*_view_*), once per function + args. It feeds
 * Moodle's "recently accessed items" and completes activities that complete on
 * view, so every viewer must call it. On success the page's course outline is
 * told, so it can pick up the new completion state; failures are ignored.
 */
export function useLogView(wsfunction: string | null, args: Record<string, unknown>) {
  const onLogged = useViewLoggedHandler();
  const key = wsfunction ? JSON.stringify(args) : null;
  useEffect(() => {
    if (!wsfunction || !key) return;
    moodleClient(wsfunction, JSON.parse(key)).then(
      () => onLogged?.(),
      () => {}
    );
  }, [wsfunction, key, onLogged]);
}

/** Activity missing, hidden or not accessible to this user. */
export function ActivityNotFound({ courseId }: { courseId?: number }) {
  const t = useT();
  return (
    <Card>
      <EmptyState
        icon={PackageOpen}
        title={t("activity.notFound")}
        hint={t("activity.notFoundHint")}
        action={
          <Button href={courseId ? `/courses/${courseId}` : "/courses"} variant="secondary">
            {t(courseId ? "activity.backToCourse" : "courses.backToCourses")}
          </Button>
        }
      />
    </Card>
  );
}

/** Moodle couldn't be reached or failed: the error, a retry and a way back. */
export function ActivityLoadError({ error, onRetry }: { error: string; onRetry: () => void }) {
  const t = useT();
  return (
    <div className="space-y-4 animate-fade-in">
      <QueryState loading={false} error={error}>
        {null}
      </QueryState>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onRetry}>
          <RotateCw size={16} strokeWidth={2} aria-hidden />
          {t("common.retry")}
        </Button>
        <Button variant="ghost" href="/courses">
          {t("courses.backToCourses")}
        </Button>
      </div>
    </div>
  );
}

/** The activity description, when the teacher wrote one. */
export function ActivityIntro({ html }: { html?: string | null }) {
  if (!html?.trim()) return null;
  return <RichText html={html} className="text-[15px] text-muted" />;
}

/** Placeholder for a viewer's main content block. */
export function ContentSkeleton() {
  return (
    <Card className="space-y-3 p-6">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-40 w-full" />
    </Card>
  );
}
