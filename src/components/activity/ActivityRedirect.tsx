"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMoodle } from "@/lib/client-api";
import type { AssignmentsResult } from "@/lib/moodle/types";
import { QueryState, Skeleton } from "@/components/ui";
import { useCourseNavigationState } from "./course-navigation";
import type { ActivityCm } from "./shared";

/** Placeholder shaped like the activity page (header, content, navigation bar). */
export function ActivitySkeleton() {
  return (
    <QueryState
      loading
      error={null}
      skeleton={
        <div className="space-y-5">
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-8 w-2/3" />
            </div>
          </div>
          <Skeleton className="h-72 w-full rounded-card" />
          <Skeleton className="h-15 w-full rounded-2xl" />
        </div>
      }
    >
      {null}
    </QueryState>
  );
}

/** Course page opened at a section (the course page resolves #sec-{sectionid}). */
const sectionHref = (courseId: number, sectionId: number) => `/courses/${courseId}#sec-${sectionId}`;

/** Modules whose portal page lives elsewhere (null: render it on /activity). */
export function redirectFor(cm: ActivityCm): string | null {
  if (cm.modname === "scorm") return `/scorm/${cm.id}?course=${cm.course}`;
  // Labels have no page of their own: they show in their section of the course page.
  if (cm.modname === "label") return sectionHref(cm.course, cm.section);
  return null;
}

/** Replaces the current history entry with `to`, showing the page skeleton meanwhile. */
export function Redirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return <ActivitySkeleton />;
}

/**
 * A subsection (Moodle 4.5+) opens the section it delegates to on the course
 * page. Only the course contents know that section (the row's customdata,
 * attached by buildOutline); without it the parent section is opened.
 */
export function SubsectionRedirect({ cm }: { cm: ActivityCm }) {
  const { nav, loading } = useCourseNavigationState(cm.course, cm.id);
  if (loading) return <ActivitySkeleton />;
  const row = nav?.outline.flatMap((s) => s.modules).find((m) => m.id === cm.id);
  return <Redirect to={sectionHref(cm.course, row?.subsection?.id ?? cm.section)} />;
}

/**
 * Assignments open the grading workspace for users who can grade this one and
 * the submission page for everyone else. mod_assign_get_assignments only
 * returns the course's assignments when the user holds every listed capability
 * in the course (includenotenrolledcourses lets site admins through); on any
 * error it falls back to the submission page.
 */
export function AssignRedirect({ cm }: { cm: ActivityCm }) {
  const { data, loading } = useMoodle<AssignmentsResult>("mod_assign_get_assignments", {
    courseids: [cm.course],
    capabilities: ["mod/assign:grade"],
    includenotenrolledcourses: true,
  });
  if (loading) return <ActivitySkeleton />;
  const canGrade = !!data?.courses.some((c) => c.assignments.some((a) => a.cmid === cm.id));
  return <Redirect to={canGrade ? `/teacher/grading/${cm.id}?course=${cm.course}` : `/assignments/${cm.id}`} />;
}
