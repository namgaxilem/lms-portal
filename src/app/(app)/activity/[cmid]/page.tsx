"use client";
import { use } from "react";
import { ActivityHeader } from "@/components/activity/ActivityHeader";
import { ActivityNav } from "@/components/activity/ActivityNav";
import {
  ActivitySkeleton,
  AssignRedirect,
  Redirect,
  SubsectionRedirect,
  redirectFor,
} from "@/components/activity/ActivityRedirect";
import { PageViewer } from "@/components/activity/PageViewer";
import { ResourceViewer } from "@/components/activity/ResourceViewer";
import { UnsupportedActivity } from "@/components/activity/UnsupportedActivity";
import { UrlViewer } from "@/components/activity/UrlViewer";
import { CourseNavigationProvider } from "@/components/activity/course-navigation";
import { ActivityLoadError, ActivityNotFound, type ActivityCm } from "@/components/activity/shared";
import { useCourseModule } from "@/components/activity/use-course-module";

/** Native viewer for the module type, or the "open on Moodle" card. */
function ActivityBody({ cm }: { cm: ActivityCm }) {
  switch (cm.modname) {
    case "page":
      return <PageViewer cm={cm} />;
    case "resource":
      return <ResourceViewer cm={cm} />;
    case "url":
      return <UrlViewer cm={cm} />;
    default:
      return <UnsupportedActivity cm={cm} />;
  }
}

function ActivityContent({ cmid }: { cmid: number | null }) {
  const { cm, loading, error, notFound, retry } = useCourseModule(cmid);

  if (cmid === null || notFound) return <ActivityNotFound />;
  if (error) return <ActivityLoadError error={error} onRetry={retry} />;
  if (loading || !cm) return <ActivitySkeleton />;

  const redirect = redirectFor(cm);
  if (redirect) return <Redirect to={redirect} />;
  if (cm.modname === "assign") return <AssignRedirect cm={cm} />;
  if (cm.modname === "subsection") return <SubsectionRedirect cm={cm} />;

  // Header, viewer and navigation share one course outline; Previous / Next
  // come after the content, where the learner finishes reading.
  return (
    <CourseNavigationProvider courseId={cm.course} cmid={cm.id}>
      <ActivityHeader cm={cm} />
      <ActivityBody cm={cm} />
      <div className="mt-8 empty:hidden">
        <ActivityNav courseId={cm.course} cmid={cm.id} />
      </div>
    </CourseNavigationProvider>
  );
}

/**
 * /activity/{cmid}: the portal's entry point for any course module. SCORM,
 * assignments, labels and subsections are redirected to their own pages; page,
 * file and URL activities render natively; other types link to Moodle.
 */
export default function ActivityPage({ params }: { params: Promise<{ cmid: string }> }) {
  const { cmid: raw } = use(params);
  const cmid = Number(raw);
  const valid = Number.isInteger(cmid) && cmid > 0;

  return (
    <div className="mx-auto max-w-5xl">
      <ActivityContent key={raw} cmid={valid ? cmid : null} />
    </div>
  );
}
