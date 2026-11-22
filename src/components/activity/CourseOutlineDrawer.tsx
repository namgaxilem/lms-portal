"use client";
import { useRef } from "react";
import Link from "next/link";
import { Drawer } from "antd";
import { Circle, CircleCheck, CirclePlay, FolderTree, Lock } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { courseStyle } from "@/lib/course-color";
import {
  completionSummary,
  flattenOutline,
  isModuleDone,
  isNavigable,
  isTracked,
  moduleRoute,
  type OutlineModule,
  type OutlineSection,
} from "@/lib/moodle/course-outline";
import { moduleMeta } from "@/lib/module-meta";
import { Progress, cn } from "@/components/ui";
import type { CourseNavigation } from "./course-navigation";

interface ItemContext {
  courseId: number;
  cmid: number;
  onNavigate: () => void;
  currentRef: React.RefObject<HTMLAnchorElement | null>;
}

const rowClass = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px]";

/** Modules listed in the outline: everything but labels (they only show on the course page). */
const isListed = (mod: OutlineModule) => mod.modname !== "label" && mod.modname !== "subsection";

/** Section or subsection rows worth listing: listed modules and non-empty subsections. */
function visibleRows(mods: OutlineModule[]): OutlineModule[] {
  return mods.filter((m) => (m.subsection ? visibleRows(m.subsection.modules).length > 0 : isListed(m)));
}

/** Done / tracked counts of a section, subsection contents included (as the course page counts). */
function sectionCount(section: OutlineSection) {
  const { done, total } = completionSummary(flattenOutline([section]));
  return total ? `${done}/${total}` : null;
}

function StatusIcon({ mod, current }: { mod: OutlineModule; current: boolean }) {
  const t = useT();
  if (current) {
    return (
      <>
        <CirclePlay size={18} strokeWidth={2} className="shrink-0 text-course" aria-hidden />
        <span className="sr-only">{t("activity.nav.current")}</span>
      </>
    );
  }
  if (!isTracked(mod)) {
    const Icon = moduleMeta(mod.modname).icon;
    return <Icon size={18} strokeWidth={1.85} className="shrink-0 text-subtle" aria-hidden />;
  }
  const done = isModuleDone(mod);
  const Icon = done ? CircleCheck : Circle;
  return (
    <>
      <Icon size={18} strokeWidth={done ? 2.2 : 1.85} className={cn("shrink-0", done ? "text-success" : "text-subtle")} aria-hidden />
      <span className="sr-only">{t(done ? "activity.nav.done" : "activity.nav.notDone")}</span>
    </>
  );
}

function ItemText({ mod }: { mod: OutlineModule }) {
  const t = useT();
  return (
    <span className="min-w-0 flex-1">
      <span className="block leading-snug">{mod.name}</span>
      <span className="block text-2xs font-medium text-subtle">{t(moduleMeta(mod.modname).labelKey)}</span>
    </span>
  );
}

function OutlineItem({ mod, ctx }: { mod: OutlineModule; ctx: ItemContext }) {
  const t = useT();
  if (!isNavigable(mod)) {
    // Shown but not open to this user (access restrictions): listed so the counts add up.
    return (
      <li className={cn(rowClass, "text-subtle")}>
        <Lock size={18} strokeWidth={1.85} className="shrink-0" aria-hidden />
        <span className="sr-only">{t("activity.nav.unavailable")}</span>
        <ItemText mod={mod} />
      </li>
    );
  }
  const current = mod.id === ctx.cmid;
  return (
    <li>
      <Link
        href={moduleRoute(mod, ctx.courseId)}
        ref={current ? ctx.currentRef : undefined}
        onClick={ctx.onNavigate}
        aria-current={current ? "page" : undefined}
        className={cn(
          rowClass,
          "transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
          current ? "bg-course-soft font-bold text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"
        )}
      >
        <StatusIcon mod={mod} current={current} />
        <ItemText mod={mod} />
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
              <FolderTree size={15} strokeWidth={1.85} className="shrink-0 text-subtle" aria-hidden />
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

function ProgressSummary({ nav }: { nav: CourseNavigation }) {
  const t = useT();
  const { progress, index, items } = nav;
  const position = index >= 0 ? t("activity.nav.position", { current: index + 1, total: items.length }) : null;
  if (!progress) {
    return position ? <p className="px-3 text-xs font-semibold tabular-nums text-subtle">{position}</p> : null;
  }
  return (
    <div className="mb-2 rounded-2xl bg-course-soft p-4">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="font-bold text-fg">{t("activity.nav.courseProgress")}</span>
        {position && <span className="font-semibold tabular-nums text-muted">{position}</span>}
      </div>
      <Progress value={progress.percent} tone="course" size="sm" className="mt-3" label={t("activity.nav.courseProgress")} />
      <p className="mt-2 text-xs font-semibold text-muted">
        {t("activity.nav.progress", { done: progress.done, total: progress.total })}
      </p>
    </div>
  );
}

/** Course outline in a side drawer, current module highlighted and scrolled into view. */
export function CourseOutlineDrawer({
  open,
  onClose,
  courseId,
  cmid,
  nav,
}: {
  open: boolean;
  onClose: () => void;
  courseId: number;
  cmid: number;
  nav: CourseNavigation;
}) {
  const t = useT();
  const currentRef = useRef<HTMLAnchorElement | null>(null);
  const ctx: ItemContext = { courseId, cmid, onNavigate: onClose, currentRef };
  const sections = nav.outline.filter((s) => visibleRows(s.modules).length > 0);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      size="min(400px, 92vw)"
      title={t("activity.nav.contents")}
      styles={{ body: { padding: 0 } }}
      afterOpenChange={(visible) => {
        if (visible) currentRef.current?.scrollIntoView({ block: "center" });
      }}
    >
      {/* The drawer renders in a portal, outside the page's --course scope. */}
      <div style={courseStyle(courseId)} className="px-3 pb-8 pt-3">
        <ProgressSummary nav={nav} />
        {sections.map((section) => {
          const count = sectionCount(section);
          return (
            <section key={section.id} aria-labelledby={`toc-sec-${section.id}`} className="mt-4">
              <h2
                id={`toc-sec-${section.id}`}
                className="flex items-center justify-between gap-3 px-3 pb-1.5 text-2xs font-extrabold uppercase tracking-wider text-subtle"
              >
                <span className="min-w-0 truncate">{section.name}</span>
                {count && <span className="shrink-0 tabular-nums">{count}</span>}
              </h2>
              <OutlineRows mods={section.modules} ctx={ctx} />
            </section>
          );
        })}
      </div>
    </Drawer>
  );
}
