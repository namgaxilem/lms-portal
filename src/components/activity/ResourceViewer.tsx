"use client";
import { FileText } from "lucide-react";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { Card, CardHeader, EmptyState, QueryState } from "@/components/ui";
import type { CourseModuleContent, MoodleFile } from "@/lib/moodle/types";
import { useCourseNavigationState } from "./course-navigation";
import { FileRow, MainFile } from "./ResourceFiles";
import {
  ActivityIntro,
  ActivityNotFound,
  ContentSkeleton,
  INSTANCE_CACHE_MS,
  useLogView,
  type ActivityCm,
} from "./shared";

/** mod_resource_get_resources_by_courses item (only the fields the viewer reads). */
interface ResourceInstance {
  coursemodule: number;
  intro?: string;
  /** Unordered (itemid, filepath, filename) and revision-less URLs: fallback only. */
  contentfiles?: MoodleFile[];
}

const isFile = (c: CourseModuleContent): c is CourseModuleContent & MoodleFile =>
  c.type === "file" && !!c.fileurl && !!c.filename;

/**
 * The resource's files, main file first, from the page's course outline
 * (core_course_get_contents): contents come "sortorder DESC" (the main file has
 * sortorder 1) with revision-stamped URLs, so a replaced file never comes back
 * stale from the cache. Null when the outline has no row for the module.
 */
function useResourceFiles(cm: ActivityCm) {
  const { nav, loading } = useCourseNavigationState(cm.course, cm.id);
  return { files: nav?.current?.contents?.filter(isFile) ?? null, loading };
}

/** mod_resource: main file previewed inline (PDF, image, video, audio), other files listed. */
export function ResourceViewer({ cm }: { cm: ActivityCm }) {
  const t = useT();
  useLogView("mod_resource_view_resource", { resourceid: cm.instance });
  const list = useMoodle<{ resources: ResourceInstance[] }>(
    "mod_resource_get_resources_by_courses",
    { courseids: [cm.course] },
    false,
    { cacheMs: INSTANCE_CACHE_MS }
  );
  const ordered = useResourceFiles(cm);
  const resource = list.data?.resources.find((r) => r.coursemodule === cm.id);
  const files = ordered.files?.length ? ordered.files : (resource?.contentfiles ?? []).filter((f) => f.fileurl);
  const [main, ...extra] = files;

  return (
    <QueryState loading={list.loading || ordered.loading} error={list.error} skeleton={<ContentSkeleton />}>
      {!resource ? (
        <ActivityNotFound courseId={cm.course} />
      ) : (
        <div className="space-y-5">
          <ActivityIntro html={resource.intro} />
          {main ? (
            <MainFile file={main} />
          ) : (
            <Card>
              <EmptyState icon={FileText} title={t("activity.noFile")} compact />
            </Card>
          )}
          {extra.length > 0 && (
            <Card className="animate-fade-in-up overflow-hidden">
              <CardHeader title={t("activity.files")} />
              <ul className="divide-y divide-line">
                {extra.map((f) => (
                  <li key={f.fileurl}>
                    <FileRow file={f} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </QueryState>
  );
}
