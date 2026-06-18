"use client";
import { use } from "react";
import Link from "next/link";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { QueryState } from "@/components/ui/QueryState";
import { MaterialIcon } from "@/components/MaterialIcon";
import { moduleMeta } from "@/lib/module-meta";
import type { CourseModule, CourseSection } from "@/lib/moodle/types";

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").trim();
}

function isDone(mod: CourseModule) {
  const s = mod.completiondata?.state;
  return s === 1 || s === 2;
}

function ModuleRow({ mod }: { mod: CourseModule }) {
  const t = useT();
  const meta = moduleMeta(mod.modname);
  const highlight = mod.modname === "scorm" || mod.modname === "quiz";
  const done = isDone(mod);

  if (mod.modname === "label") {
    const text = stripHtml(mod.description ?? "");
    return text ? (
      <div className="px-4 py-3 font-body-sm text-body-sm italic text-on-surface-variant">
        {text}
      </div>
    ) : null;
  }

  const action =
    mod.modname === "scorm"
      ? t("courses.launch")
      : mod.modname === "quiz"
        ? t("courses.attempt")
        : t("common.open");

  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-container/60">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          done
            ? "bg-secondary-container text-on-secondary-container"
            : highlight
              ? "bg-primary-container/10 text-primary"
              : "bg-surface-container text-on-surface-variant"
        }`}
      >
        <MaterialIcon
          name={done ? "check_circle" : meta.iconName}
          fill={done}
          className="!text-lg"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-body-md font-semibold text-on-surface">
          {mod.name}
        </p>
        {mod.description && (
          <p className="truncate font-body-sm text-body-sm text-on-surface-variant">
            {stripHtml(mod.description).slice(0, 90)}
          </p>
        )}
      </div>

      <span
        className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase sm:inline ${
          highlight
            ? "bg-primary-container/10 text-primary"
            : "bg-surface-container text-on-surface-variant"
        }`}
      >
        {t(meta.labelKey)}
      </span>

      {mod.url &&
        (mod.modname === "scorm" ? (
          <Link
            href={`/scorm/${mod.id}`}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-on-primary transition-all hover:opacity-90 active:scale-95"
          >
            {action}
            <MaterialIcon name="play_arrow" className="!text-sm" />
          </Link>
        ) : (
          <a
            href={mod.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
              highlight
                ? "bg-primary text-on-primary hover:opacity-90"
                : "border border-outline-variant text-on-surface hover:border-primary hover:text-primary"
            }`}
          >
            {action}
            <MaterialIcon name="arrow_forward" className="!text-sm" />
          </a>
        ))}
    </div>
  );
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

  const sections = (data ?? []).filter(
    (s) => s.uservisible !== false && s.modules.length > 0
  );

  function counts(section: CourseSection) {
    return section.modules.reduce(
      (acc, m) => {
        if (m.modname === "scorm") acc.scorm++;
        if (m.modname === "quiz") acc.quiz++;
        return acc;
      },
      { scorm: 0, quiz: 0 }
    );
  }

  return (
    <div className="space-y-gutter">
      {/* Breadcrumb + title */}
      <div>
        <nav className="mb-2 flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
          <Link href="/courses" className="hover:text-primary">
            {t("nav.courses")}
          </Link>
          <MaterialIcon name="chevron_right" className="!text-sm" />
          <span className="font-bold text-primary">{t("courses.contents")}</span>
        </nav>
        <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
          {t("courses.contents")}
        </h2>
      </div>

      <QueryState loading={loading} error={error}>
        {sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl bg-surface-container-lowest p-lg text-center card-elevation">
            <MaterialIcon name="inbox" className="!text-5xl text-outline-variant" />
            <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
              {t("courses.noVisibleContent")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
            {/* Main: sections */}
            <div className="space-y-gutter lg:col-span-8">
              {sections.map((section, i) => {
                const c = counts(section);
                return (
                  <div
                    key={section.id}
                    id={`sec-${section.id}`}
                    style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                    className="overflow-hidden rounded-xl bg-surface-container-lowest card-elevation animate-fade-in-up"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-outline-variant/30 bg-surface px-5 py-4">
                      <h3 className="font-headline-sm text-headline-sm text-on-surface">
                        {section.name || `${t("courses.contents")} ${section.section}`}
                      </h3>
                      <div className="flex gap-1.5">
                        {c.scorm > 0 && (
                          <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-on-primary">
                            {c.scorm} {t("modules.scorm")}
                          </span>
                        )}
                        {c.quiz > 0 && (
                          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold text-on-secondary">
                            {c.quiz} {t("modules.quiz")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="divide-y divide-outline-variant/20">
                      {section.modules
                        .filter((m) => m.uservisible !== false)
                        .map((mod) => (
                          <ModuleRow key={mod.id} mod={mod} />
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sidebar: course content nav (sticky) */}
            <div className="lg:col-span-4">
              <div className="overflow-hidden rounded-xl bg-surface-container-lowest card-elevation lg:sticky lg:top-20">
                <div className="border-b border-outline-variant/30 bg-surface px-5 py-4">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">
                    {t("courses.contents")}
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {sections.length} {t("courses.sections")}
                  </p>
                </div>
                <div className="max-h-[60vh] divide-y divide-outline-variant/20 overflow-y-auto">
                  {sections.map((section) => {
                    const c = counts(section);
                    return (
                      <a
                        key={section.id}
                        href={`#sec-${section.id}`}
                        className="flex items-center justify-between gap-2 px-5 py-3 transition-colors hover:bg-surface-container"
                      >
                        <span className="min-w-0 truncate font-body-sm text-body-sm font-semibold text-on-surface">
                          {section.name || `${t("courses.contents")} ${section.section}`}
                        </span>
                        <span className="shrink-0 text-xs text-outline">
                          {section.modules.length}
                          {c.scorm + c.quiz > 0 && (
                            <span className="ml-1 text-primary">●</span>
                          )}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </QueryState>
    </div>
  );
}
