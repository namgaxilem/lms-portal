"use client";
import { useMoodle } from "@/lib/client-api";
import { Card, QueryState, RichText } from "@/components/ui";
import { ActivityNotFound, ContentSkeleton, INSTANCE_CACHE_MS, useLogView, type ActivityCm } from "./shared";

/** mod_page_get_pages_by_courses item (only the fields the viewer reads). */
interface PageInstance {
  coursemodule: number;
  /** Formatted HTML (the WS is called without moodlewssettingraw). */
  content?: string;
}

/** mod_page: the page's HTML content in a comfortable reading column. */
export function PageViewer({ cm }: { cm: ActivityCm }) {
  useLogView("mod_page_view_page", { pageid: cm.instance });
  const { data, loading, error } = useMoodle<{ pages: PageInstance[] }>(
    "mod_page_get_pages_by_courses",
    { courseids: [cm.course] },
    false,
    { cacheMs: INSTANCE_CACHE_MS }
  );
  const page = data?.pages.find((p) => p.coursemodule === cm.id);

  return (
    <QueryState loading={loading} error={error} skeleton={<ContentSkeleton />}>
      {!page ? (
        <ActivityNotFound courseId={cm.course} />
      ) : (
        <Card className="animate-fade-in-up px-5 py-6 sm:px-10 sm:py-9">
          <article className="mx-auto max-w-3xl">
            <RichText html={page.content} className="text-[15px]" />
          </article>
        </Card>
      )}
    </QueryState>
  );
}
