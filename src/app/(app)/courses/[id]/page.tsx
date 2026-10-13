"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Circle,
  Inbox,
  Play,
} from "lucide-react";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconTile,
  PageHeader,
  Progress,
  QueryState,
  Skeleton,
  cn,
} from "@/components/ui";
import { moduleMeta } from "@/lib/module-meta";
import { stripHtml } from "@/lib/format";
import type { CourseModule, CourseSection, TimelineCourse } from "@/lib/moodle/types";

function isDone(mod: CourseModule) {
  const s = mod.completiondata?.state;
  return s === 1 || s === 2;
}

/** Modules with completion tracking (label rows never count). */
function isTracked(mod: CourseModule) {
  return mod.modname !== "label" && !!mod.completiondata;
}

function ModuleRow({ mod }: { mod: CourseModule }) {
  const t = useT();
  const meta = moduleMeta(mod.modname);
  const Icon = meta.icon;
  const highlight = mod.modname === "scorm" || mod.modname === "quiz";
  const done = isDone(mod);

  if (mod.modname === "label") {
    const text = stripHtml(mod.description ?? "");
    return text ? (
      <div className="px-5 py-3 text-[13px] text-muted">{text}</div>
    ) : null;
  }

  const action =
    mod.modname === "scorm"
      ? t("courses.launch")
      : mod.modname === "quiz"
        ? t("courses.attempt")
        : t("common.open");

  return (
    <div className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2">
      <IconTile icon={Icon} tone={meta.tone} size="sm" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{mod.name}</p>
        <p className="truncate text-xs text-subtle">
          {t(meta.labelKey)}
          {mod.description && (
            <span className="hidden sm:inline">
              {" · "}
              {stripHtml(mod.description).slice(0, 90)}
            </span>
          )}
        </p>
      </div>

      {mod.completiondata ? (
        done ? (
          <CheckCircle2
            size={18}
            strokeWidth={1.75}
            className="shrink-0 text-success"
            aria-label={t("courses.completed")}
          />
        ) : (
          <Circle size={18} strokeWidth={1.75} className="shrink-0 text-line-strong" aria-hidden />
        )
      ) : null}

      {mod.url &&
        (mod.modname === "scorm" ? (
          <Button href={`/scorm/${mod.id}`} variant="secondary" size="sm" className="shrink-0">
            {action}
            <Play size={14} strokeWidth={1.75} />
          </Button>
        ) : (
          <Button
            href={`/activity/${mod.id}`}
            variant={highlight ? "secondary" : "ghost"}
            size="sm"
            className="shrink-0"
          >
            {action}
            <ArrowRight size={14} strokeWidth={1.75} />
          </Button>
        ))}
    </div>
  );
}

function SectionCard({
  section,
  title,
}: {
  section: CourseSection;
  title: string;
}) {
  const mods = section.modules.filter((m) => m.uservisible !== false);
  const tracked = mods.filter(isTracked);
  const done = tracked.filter(isDone).length;

  return (
    <Card id={`sec-${section.id}`} className="scroll-mt-20 overflow-hidden">
      <details open className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <ChevronDown
              size={16}
              strokeWidth={1.75}
              className="shrink-0 -rotate-90 text-subtle transition-transform group-open:rotate-0"
            />
            <h2 className="truncate text-sm font-semibold text-fg">{title}</h2>
          </div>
          {tracked.length > 0 && (
            <Badge
              tone={done === tracked.length ? "success" : "neutral"}
              className="shrink-0 tabular-nums"
            >
              {done}/{tracked.length}
            </Badge>
          )}
        </summary>
        <div className="divide-y divide-line border-t border-line">
          {mods.map((mod) => (
            <ModuleRow key={mod.id} mod={mod} />
          ))}
        </div>
      </details>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-line bg-surface">
          <div className="border-b border-line px-5 py-4">
            <Skeleton className="h-4 w-1/3" />
          </div>
          {Array.from({ length: 3 }).map((__, j) => (
            <div key={j} className="flex items-center gap-3 px-5 py-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-1/5" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Tracks which section is currently in view for the TOC highlight. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join(",");

  useEffect(() => {
    if (!key) return;
    const els = key
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (!els.length) return;
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting);
        const first = els.find((el) => visible.get(el.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-80px 0px -55% 0px" }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [key]);

  return active;
}

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const courseid = Number(id);

  const { data, loading, error } = useMoodle<CourseSection[]>(
    "core_course_get_contents",
    { courseid }
  );
  // Course title / summary / progress come from the enrolment list.
  const enrolled = useMoodle<{ courses: TimelineCourse[] }>(
    "core_course_get_enrolled_courses_by_timeline_classification",
    { classification: "all", limit: 0, offset: 0, sort: "fullname" }
  );
  const course = enrolled.data?.courses.find((c) => c.id === courseid);

  const sections = (data ?? []).filter(
    (s) => s.uservisible !== false && s.modules.length > 0
  );
  const sectionTitle = (s: CourseSection) =>
    s.name || `${t("courses.contents")} ${s.section}`;

  // Prefer Moodle's reported progress; otherwise derive it from completion data.
  const tracked = sections.flatMap((s) =>
    s.modules.filter((m) => m.uservisible !== false && isTracked(m))
  );
  const pct =
    typeof course?.progress === "number"
      ? Math.round(course.progress)
      : tracked.length
        ? Math.round((tracked.filter(isDone).length / tracked.length) * 100)
        : null;

  const active = useActiveSection(sections.map((s) => `sec-${s.id}`));
  const summary = course?.summary ? stripHtml(course.summary) : "";

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        eyebrow={
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-fg"
          >
            <ArrowLeft size={14} strokeWidth={1.75} />
            {t("courses.backToCourses")}
          </Link>
        }
        title={course?.fullname ?? t("courses.contents")}
        description={
          <>
            {summary && (
              <span className="line-clamp-2 max-w-2xl">{summary}</span>
            )}
            {!loading && sections.length > 0 && (
              <span className="mt-1 block text-[13px] tabular-nums text-subtle">
                {sections.length} {t("courses.sections")}
              </span>
            )}
          </>
        }
      />

      {pct !== null && (
        <div className="-mt-2 mb-8 flex max-w-md items-center gap-3">
          <Progress value={pct} tone={pct >= 100 ? "success" : "primary"} className="flex-1" />
          <span className="text-xs tabular-nums text-muted">
            {pct}% · {t("courses.progress")}
          </span>
        </div>
      )}

      <QueryState loading={loading} error={error} skeleton={<DetailSkeleton />}>
        {sections.length === 0 ? (
          <Card>
            <EmptyState icon={Inbox} title={t("courses.noVisibleContent")} />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="min-w-0 space-y-4">
              {sections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  title={sectionTitle(section)}
                />
              ))}
            </div>

            <nav
              aria-label={t("courses.contents")}
              className="hidden lg:block"
            >
              <div className="sticky top-20">
                <p className="mb-3 text-xs font-medium text-subtle">
                  {t("courses.contents")}
                </p>
                <ul className="max-h-[70vh] space-y-0.5 overflow-y-auto border-l border-line">
                  {sections.map((section) => {
                    const isActive = active === `sec-${section.id}`;
                    return (
                      <li key={section.id}>
                        <a
                          href={`#sec-${section.id}`}
                          aria-current={isActive ? "location" : undefined}
                          className={cn(
                            "-ml-px block truncate border-l py-1.5 pl-3 text-[13px] transition-colors",
                            isActive
                              ? "border-primary font-medium text-primary-text"
                              : "border-transparent text-muted hover:text-fg"
                          )}
                        >
                          {sectionTitle(section)}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </nav>
          </div>
        )}
      </QueryState>
    </div>
  );
}
