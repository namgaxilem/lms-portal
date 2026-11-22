"use client";
import { useMemo } from "react";
import { useT } from "@/i18n/I18nProvider";
import { useMoodle } from "@/lib/client-api";
import { moduleMeta } from "@/lib/module-meta";
import type { CourseModule, CourseSection } from "@/lib/moodle/types";
import { firstUnfinished } from "./lib";
import { useInView } from "./useInView";

function ActivityLine({ mod, section }: { mod: CourseModule; section: string }) {
  const t = useT();
  const { icon: Icon, labelKey } = moduleMeta(mod.modname);
  return (
    <>
      <p className="mt-0.5 flex min-w-0 items-center gap-2 text-[13px] font-semibold text-fg">
        <Icon size={16} strokeWidth={1.85} aria-hidden className="shrink-0 text-course" />
        <span className="truncate" title={mod.name}>
          {mod.name}
        </span>
      </p>
      <p className="mt-0.5 truncate text-xs text-muted">{[t(labelKey), section].filter(Boolean).join(" · ")}</p>
    </>
  );
}

function Placeholder() {
  return (
    <span aria-hidden className="mt-1.5 block space-y-1.5">
      <span className="block h-4 w-4/5 animate-pulse rounded-md bg-surface-3" />
      <span className="block h-3 w-1/2 animate-pulse rounded-md bg-surface-3" />
    </span>
  );
}

/**
 * "Up next" panel of a course card: the first unfinished tracked activity in
 * course order (core_course_get_contents completion data). The outline is
 * fetched only once the card nears the viewport, through the same one-minute
 * cache entry the activity pages read, so opening "up next" reuses it.
 * Renders nothing when the outline fails to load or every activity is done.
 */
export function NextActivity({ courseId }: { courseId: number }) {
  const t = useT();
  const [ref, inView] = useInView<HTMLDivElement>();
  const { data, error } = useMoodle<CourseSection[]>("core_course_get_contents", { courseid: courseId }, !inView, {
    cacheMs: 60_000,
  });
  const next = useMemo(() => (data ? firstUnfinished(data) : null), [data]);

  if (error || (data && !next)) return null;

  return (
    <div ref={ref} className="rounded-2xl bg-surface-2 p-3 transition-colors group-hover:bg-course-soft">
      <p className="text-[11px] font-bold uppercase tracking-wide text-subtle">{t("courses.nextUp")}</p>
      {next ? <ActivityLine mod={next.mod} section={next.section} /> : <Placeholder />}
    </div>
  );
}
