"use client";
import { ChevronDown, ChevronsDownUp, ChevronsUpDown, Check, FolderTree, Lock, Play } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Badge, Button, Card, IconTile, RichText, Skeleton, cn } from "@/components/ui";
import { formatDate, hasRichContent } from "@/lib/format";
import {
  flattenOutline,
  isModuleDone,
  isTracked,
  type OutlineModule,
  type OutlineSection,
} from "@/lib/moodle/course-outline";
import { moduleTiming, sectionProgress } from "./lib";
import { AvailabilityNote, LabelRow, ModuleRow, type ToggleCompletion } from "./ModuleRow";

type SectionState = "done" | "current" | "upcoming" | "locked";

/** Shared by every row of the outline. */
export interface OutlineContext {
  courseId: number;
  now: number;
  resumeId: number | null;
  /** Course module ids the calendar lists as overdue. */
  overdue: Set<number>;
  isOpen: (id: number, fallback: boolean) => boolean;
  setOpen: (id: number, open: boolean) => void;
  onToggleCompletion: ToggleCompletion;
}

/** Secondary line under a (sub)section title: progress, size, next opening date. */
function useSectionSubtitle(section: OutlineSection, now: number) {
  const t = useT();
  const { locale } = useLocale();
  if (section.uservisible === false) return t("course.section.locked");
  const mods = flattenOutline([section]);
  const { done, total } = sectionProgress(section);
  const parts: string[] = [];
  // Only staff receive hidden sections.
  if (section.visible === 0) parts.push(t("course.hiddenFromStudents"));
  if (total > 0) parts.push(t("course.section.progress", { done, total }));
  else {
    const count = mods.filter((m) => m.modname !== "label").length;
    if (count > 0) parts.push(t("course.section.activities", { n: count }));
  }
  if (done === 0) {
    const opens = mods
      .flatMap((m) => {
        const timing = moduleTiming(m, now);
        return timing?.state === "notOpen" ? [timing.time] : [];
      })
      .sort((a, b) => a - b)[0];
    if (opens) parts.push(t("course.timing.opens", { time: formatDate(opens, locale) }));
  }
  return parts.join(" · ");
}

/** done/total pill; decorative, the subtitle already says it in words. */
function ProgressBadge({ done, total }: { done: number; total: number }) {
  if (!total) return null;
  return (
    <Badge aria-hidden tone={done === total ? "success" : "neutral"} className="shrink-0 tabular-nums">
      {done}/{total}
    </Badge>
  );
}

function ModuleList({ modules, ctx }: { modules: OutlineModule[]; ctx: OutlineContext }) {
  return (
    <ul className="divide-y divide-line">
      {modules.map((mod) => {
        if (mod.subsection) return <SubsectionItem key={mod.id} section={mod.subsection} ctx={ctx} />;
        if (mod.modname === "subsection") return null;
        if (mod.modname === "label") return <LabelRow key={mod.id} mod={mod} />;
        return (
          <ModuleRow
            key={mod.id}
            mod={mod}
            courseId={ctx.courseId}
            now={ctx.now}
            resume={mod.id === ctx.resumeId}
            overdue={ctx.overdue.has(mod.id)}
            onToggleCompletion={ctx.onToggleCompletion}
          />
        );
      })}
    </ul>
  );
}

/** Summary, restriction note and modules of an open (sub)section. */
function SectionBody({ section, ctx }: { section: OutlineSection; ctx: OutlineContext }) {
  const availability = section.availabilityinfo;
  return (
    <>
      {hasRichContent(section.summary) && (
        <div className="px-3.5 py-3 sm:px-5">
          <RichText html={section.summary} />
        </div>
      )}
      {hasRichContent(availability) && (
        <div className="px-3.5 py-3 sm:px-5">
          <AvailabilityNote html={availability} />
        </div>
      )}
      {section.modules.length > 0 && <ModuleList modules={section.modules} ctx={ctx} />}
    </>
  );
}

/** A 4.5+ subsection, nested and collapsible inside its parent section. */
function SubsectionItem({ section, ctx }: { section: OutlineSection; ctx: OutlineContext }) {
  const t = useT();
  const open = ctx.isOpen(section.id, true);
  const { done, total } = sectionProgress(section);
  const subtitle = useSectionSubtitle(section, ctx.now);
  const panelId = `sec-${section.id}-body`;
  return (
    <li className="px-2.5 py-3 sm:px-4">
      <section
        id={`sec-${section.id}`}
        aria-labelledby={`sec-${section.id}-title`}
        className="scroll-mt-24 overflow-hidden rounded-2xl border border-line bg-surface-2/50"
      >
        <h3 id={`sec-${section.id}-title`}>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => ctx.setOpen(section.id, !open)}
            className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-4"
          >
            <IconTile icon={section.uservisible === false ? Lock : FolderTree} tone="neutral" size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-fg">{section.name || t("modules.subsection")}</span>
              {subtitle && <span className="mt-0.5 block text-xs text-subtle">{subtitle}</span>}
            </span>
            <ProgressBadge done={done} total={total} />
            <ChevronDown
              size={18}
              aria-hidden
              className={cn("shrink-0 text-subtle transition-transform", open && "rotate-180")}
            />
          </button>
        </h3>
        {open && (
          <div id={panelId} className="border-t border-line bg-surface">
            <SectionBody section={section} ctx={ctx} />
          </div>
        )}
      </section>
    </li>
  );
}

function SectionNode({ state, index }: { state: SectionState; index: number }) {
  const base = "relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold sm:h-10 sm:w-10 sm:text-sm";
  if (state === "done") {
    return (
      <span aria-hidden className={cn(base, "bg-emerald-500 text-white shadow-md shadow-emerald-500/30")}>
        <Check size={18} strokeWidth={3} />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span aria-hidden className={cn(base, "bg-course-gradient text-white shadow-course")}>
        <span className="absolute inset-0 rounded-full bg-course opacity-30 motion-safe:animate-ping" />
        <Play size={15} fill="currentColor" className="relative" />
      </span>
    );
  }
  if (state === "locked") {
    return (
      <span aria-hidden className={cn(base, "bg-surface-2 text-subtle ring-2 ring-line")}>
        <Lock size={15} />
      </span>
    );
  }
  return (
    <span aria-hidden className={cn(base, "bg-surface text-subtle ring-2 ring-line-strong")}>
      {index + 1}
    </span>
  );
}

function SectionItem({
  section,
  index,
  last,
  current,
  defaultOpen,
  ctx,
}: {
  section: OutlineSection;
  index: number;
  last: boolean;
  current: boolean;
  defaultOpen: boolean;
  ctx: OutlineContext;
}) {
  const t = useT();
  const open = ctx.isOpen(section.id, defaultOpen);
  const { done, total } = sectionProgress(section);
  const subtitle = useSectionSubtitle(section, ctx.now);
  const state: SectionState =
    section.uservisible === false ? "locked" : current ? "current" : total > 0 && done === total ? "done" : "upcoming";
  const title = section.name || t("course.section.fallback", { n: section.section });
  const panelId = `sec-${section.id}-body`;

  return (
    <li className="flex gap-2.5 sm:gap-4">
      <div className="flex flex-col items-center pt-3">
        <SectionNode state={state} index={index} />
        {!last && (
          <span
            aria-hidden
            className={cn("mt-1 w-1 flex-1 rounded-full", state === "done" ? "bg-emerald-300 dark:bg-emerald-500/40" : "bg-line")}
          />
        )}
      </div>
      <section
        id={`sec-${section.id}`}
        aria-labelledby={`sec-${section.id}-title`}
        className="mb-4 min-w-0 flex-1 scroll-mt-24 sm:mb-5"
      >
        <Card className={cn("overflow-hidden", current && "ring-2 ring-(color:--course)/50")}>
          <h2 id={`sec-${section.id}-title`}>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => ctx.setOpen(section.id, !open)}
              className="flex w-full items-center gap-3 px-3.5 py-4 text-left transition-colors hover:bg-surface-2/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold text-fg">{title}</span>
                {subtitle && <span className="mt-0.5 block text-[13px] text-subtle">{subtitle}</span>}
              </span>
              {current && (
                <>
                  <span className="sr-only sm:hidden">{t("course.section.current")}</span>
                  <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-course-soft px-2.5 py-1 text-xs font-bold text-fg sm:inline-flex">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-course" />
                    {t("course.section.current")}
                  </span>
                </>
              )}
              <ProgressBadge done={done} total={total} />
              <ChevronDown
                size={20}
                aria-hidden
                className={cn("shrink-0 text-subtle transition-transform", open && "rotate-180")}
              />
            </button>
          </h2>
          {open && (
            <div id={panelId} className="border-t border-line">
              <SectionBody section={section} ctx={ctx} />
            </div>
          )}
        </Card>
      </section>
    </li>
  );
}

/** Content tab: the course sections as a vertical timeline (done / current / upcoming). */
export function CourseTimeline({
  outline,
  currentSectionId,
  defaultOpenIds,
  ctx,
  onSetAll,
}: {
  outline: OutlineSection[];
  currentSectionId: number | null;
  defaultOpenIds: Set<number>;
  ctx: OutlineContext;
  onSetAll: (ids: number[], open: boolean) => void;
}) {
  const t = useT();
  const mods = flattenOutline(outline);
  const activities = mods.filter((m) => m.modname !== "label").length;
  const subsectionIds = outline.flatMap((s) => s.modules.flatMap((m) => (m.subsection ? [m.subsection.id] : [])));
  const allOpen =
    outline.every((s) => ctx.isOpen(s.id, defaultOpenIds.has(s.id))) && subsectionIds.every((id) => ctx.isOpen(id, true));
  const tracked = mods.filter(isTracked);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-subtle">
          {t("course.outlineCount", { sections: outline.length, activities })}
          {tracked.length > 0 && (
            <span className="text-subtle"> · {t("course.doneCount", { n: tracked.filter(isModuleDone).length })}</span>
          )}
        </p>
        <Button variant="ghost" size="md" onClick={() => onSetAll([...outline.map((s) => s.id), ...subsectionIds], !allOpen)}>
          {allOpen ? <ChevronsDownUp size={16} aria-hidden /> : <ChevronsUpDown size={16} aria-hidden />}
          {allOpen ? t("course.collapseAll") : t("course.expandAll")}
        </Button>
      </div>
      <ol>
        {outline.map((section, i) => (
          <SectionItem
            key={section.id}
            section={section}
            index={i}
            last={i === outline.length - 1}
            current={section.id === currentSectionId}
            defaultOpen={defaultOpenIds.has(section.id)}
            ctx={ctx}
          />
        ))}
      </ol>
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-2.5 sm:gap-4">
          <Skeleton className="mt-3 h-8 w-8 shrink-0 rounded-full sm:h-10 sm:w-10" />
          <Card className="flex-1 p-4 sm:p-5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="mt-2 h-3 w-1/4" />
            {i === 0 && (
              <div className="mt-5 space-y-4">
                {Array.from({ length: 3 }).map((__, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 sm:h-11 sm:w-11" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-1/2" />
                      <Skeleton className="h-3 w-1/5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ))}
    </div>
  );
}
