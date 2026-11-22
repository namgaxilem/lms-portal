"use client";
import Link from "next/link";
import { Circle, CircleCheck, CirclePlay, FolderTree } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Progress, cn } from "@/components/ui";
import {
  completionSummary,
  isModuleDone,
  isNavigable,
  isTracked,
  moduleRoute,
  type OutlineModule,
} from "@/lib/moodle/course-outline";
import { moduleMeta } from "@/lib/module-meta";
import type { CourseNavigation } from "@/components/activity/course-navigation";
import { CurrentBar, currentRowClass } from "./ScormToc";

interface ItemContext {
  courseId: number;
  cmid: number;
}

/** Rows worth listing: navigable modules and subsections with something navigable inside. */
function visibleRows(mods: OutlineModule[]): OutlineModule[] {
  return mods.filter((m) => (m.subsection ? m.subsection.modules.some(isNavigable) : isNavigable(m)));
}

/** "done/total" over a section's tracked modules, subsection contents included (as the course page counts). */
function sectionCount(mods: OutlineModule[]) {
  const { done, total } = completionSummary(mods.flatMap((m) => (m.subsection ? m.subsection.modules : [m])));
  return total ? `${done}/${total}` : null;
}

function StatusIcon({ mod, current }: { mod: OutlineModule; current: boolean }) {
  const t = useT();
  if (current) return <CirclePlay size={18} strokeWidth={2} aria-hidden className="shrink-0 text-course" />;
  if (!isTracked(mod)) {
    const Icon = moduleMeta(mod.modname).icon;
    return <Icon size={18} strokeWidth={1.85} aria-hidden className="shrink-0 text-subtle" />;
  }
  if (!isModuleDone(mod)) return <Circle size={18} strokeWidth={1.85} aria-hidden className="shrink-0 text-line-strong" />;
  return (
    <>
      <CircleCheck size={18} strokeWidth={2.2} aria-hidden className="shrink-0 text-success" />
      <span className="sr-only">{t("scorm.status.completed")}, </span>
    </>
  );
}

function OutlineItem({ mod, ctx }: { mod: OutlineModule; ctx: ItemContext }) {
  const t = useT();
  const current = mod.id === ctx.cmid;
  return (
    <li>
      <Link
        href={moduleRoute(mod, ctx.courseId)}
        aria-current={current ? "page" : undefined}
        className={cn(
          "flex min-h-10 items-center gap-3 rounded-control px-3 py-2 text-[13px] transition-colors",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
          current ? currentRowClass : "text-muted hover:bg-surface-2 hover:text-fg"
        )}
      >
        {current && <CurrentBar />}
        <StatusIcon mod={mod} current={current} />
        <span className="min-w-0 flex-1">
          <span className="block leading-snug">{mod.name}</span>
          <span className="block text-2xs font-medium text-subtle">{t(moduleMeta(mod.modname).labelKey)}</span>
        </span>
      </Link>
    </li>
  );
}

function OutlineRows({ mods, ctx }: { mods: OutlineModule[]; ctx: ItemContext }) {
  return (
    <ul className="space-y-0.5">
      {visibleRows(mods).map((mod) =>
        mod.subsection ? (
          <li key={mod.id} className="pt-1">
            <p className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-fg">
              <FolderTree size={15} strokeWidth={1.85} aria-hidden className="shrink-0 text-subtle" />
              <span className="min-w-0 truncate">{mod.subsection.name}</span>
            </p>
            <div className="ml-5 border-l border-line pl-1.5">
              <OutlineRows mods={mod.subsection.modules} ctx={ctx} />
            </div>
          </li>
        ) : (
          <OutlineItem key={mod.id} mod={mod} ctx={ctx} />
        )
      )}
    </ul>
  );
}

/**
 * Course progress at the top of the outline. Shown only below md: from md the
 * player header carries it.
 */
function CourseProgressSummary({ progress }: { progress: NonNullable<CourseNavigation["progress"]> }) {
  const t = useT();
  return (
    <div className="mb-3 rounded-2xl bg-course-soft px-3.5 py-3 md:hidden">
      <div className="flex items-baseline justify-between gap-3 text-xs font-bold text-fg">
        <span>{t("scorm.courseProgress")}</span>
        <span className="tabular-nums">{progress.percent}%</span>
      </div>
      <Progress value={progress.percent} tone="course" size="sm" label={t("scorm.courseProgress")} className="mt-2" />
    </div>
  );
}

/** The course's sections and activities, the current one highlighted (focus-mode side panel). */
export function CourseOutline({ nav, courseId, cmid }: { nav: CourseNavigation; courseId: number; cmid: number }) {
  const ctx: ItemContext = { courseId, cmid };
  const sections = nav.outline.filter((s) => visibleRows(s.modules).length > 0);
  return (
    <>
      {nav.progress && <CourseProgressSummary progress={nav.progress} />}
      <div className="space-y-4">
        {sections.map((section) => {
          const count = sectionCount(section.modules);
          return (
            <section key={section.id} aria-labelledby={`scorm-sec-${section.id}`}>
              <h3
                id={`scorm-sec-${section.id}`}
                className="flex items-center justify-between gap-3 px-3 pb-1.5 text-2xs font-extrabold uppercase tracking-wider text-subtle"
              >
                <span className="min-w-0 truncate">{section.name}</span>
                {count && <span className="shrink-0 tabular-nums">{count}</span>}
              </h3>
              <OutlineRows mods={section.modules} ctx={ctx} />
            </section>
          );
        })}
      </div>
    </>
  );
}
