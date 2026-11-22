"use client";
import { ChevronRight } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { useCourseDetails } from "@/lib/moodle/hooks";
import { moduleMeta } from "@/lib/module-meta";
import { BackLink, Badge, IconTile, Skeleton } from "@/components/ui";
import { OutlineButton } from "./ActivityNav";
import { CompletionToggle } from "./CompletionToggle";
import { useCourseNavigationState } from "./course-navigation";
import type { ActivityCm } from "./shared";

/** Course › section › subsection trail; the course link (40px tall) doubles as "back". */
function Breadcrumb({ cm, trail }: { cm: ActivityCm; trail: string[] }) {
  const t = useT();
  const { byId } = useCourseDetails([cm.course]);
  const courseName = byId.get(cm.course)?.fullname;

  return (
    <nav aria-label={t("activity.breadcrumb")} className="mb-3">
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[13px] font-semibold">
        <li className="min-w-0 max-w-full">
          <BackLink href={`/courses/${cm.course}`}>{courseName ?? t("activity.backToCourse")}</BackLink>
        </li>
        {trail.map((name, i) => (
          <li key={`${i}-${name}`} className="flex min-w-0 max-w-full items-center gap-1.5 text-subtle">
            <ChevronRight size={14} strokeWidth={2} aria-hidden className="shrink-0" />
            <span className="truncate">{name}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** "Learn focus" header: breadcrumb, activity type and title, completion and the course outline. */
export function ActivityHeader({ cm }: { cm: ActivityCm }) {
  const t = useT();
  const meta = moduleMeta(cm.modname);
  const { nav, loading } = useCourseNavigationState(cm.course, cm.id);

  return (
    <header className="mb-6 animate-fade-in">
      <Breadcrumb cm={cm} trail={nav?.trail ?? []} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <IconTile icon={meta.icon} tone={meta.tone} solid size="lg" />
          <div className="min-w-0">
            <Badge tone={meta.tone}>{t(meta.labelKey)}</Badge>
            <h1 className="mt-1.5 break-words text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">{cm.name}</h1>
          </div>
        </div>
        {(loading || nav) && (
          <div className="flex shrink-0 flex-wrap items-start gap-2 sm:justify-end">
            <CompletionToggle courseId={cm.course} cmid={cm.id} />
            {nav ? (
              <OutlineButton courseId={cm.course} cmid={cm.id} nav={nav} variant="header" />
            ) : (
              <Skeleton className="h-10 w-32" />
            )}
          </div>
        )}
      </div>
    </header>
  );
}
