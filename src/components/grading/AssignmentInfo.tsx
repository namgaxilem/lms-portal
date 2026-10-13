"use client";
import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Badge, Button, Card, RichText } from "@/components/ui";
import type { Assignment, GradingMeta } from "@/lib/moodle/types";
import { formatDateTime, type ParticipantFilter } from "./lib";

function methodKey(assignment: Assignment, meta: GradingMeta | null | undefined) {
  if (meta?.method === "rubric" || meta?.method === "guide") return meta.method;
  return assignment.grade < 0 ? "scale" : "points";
}

/** Assignment header: name, due date, grading method, counts, intro. */
export function AssignmentInfo({
  assignment: a,
  meta,
  counts,
  adminLink,
}: {
  assignment: Assignment;
  meta: GradingMeta | null | undefined;
  counts: Record<ParticipantFilter, number>;
  /** "Open in Moodle" escape hatch, site admins only. */
  adminLink?: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const [now] = useState(() => Date.now() / 1000);
  const overdue = a.duedate > 0 && a.duedate < now;

  const stats: [string, number][] = [
    [t("grading.filter.needsGrading"), counts.needsGrading],
    [t("grading.filter.submitted"), counts.submitted],
    [t("grading.participants"), counts.all],
  ];

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-fg">{a.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-subtle">
            <span className="tabular-nums">
              {t("grading.due")}: {a.duedate ? formatDateTime(a.duedate, locale) : "—"}
            </span>
            {overdue && (
              <Badge tone="danger" dot>
                {t("grading.overdue")}
              </Badge>
            )}
            <Badge tone="violet">{t(`grading.method.${methodKey(a, meta)}`)}</Badge>
            {!!a.teamsubmission && <Badge tone="accent">{t("grading.teamSubmission")}</Badge>}
            {!!a.blindmarking && <Badge tone="neutral">{t("grading.blindMarking")}</Badge>}
            {!!a.markingworkflow && <Badge tone="neutral">{t("grading.markingWorkflow")}</Badge>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-5">
          {stats.map(([label, n]) => (
            <div key={label} className="text-right">
              <p className="text-lg font-semibold tabular-nums text-fg">{n}</p>
              <p className="text-xs text-subtle">{label}</p>
            </div>
          ))}
          {adminLink && (
            <Button variant="ghost" size="icon-sm" href={adminLink} external aria-label={t("grading.openInMoodle")}>
              <ExternalLink size={16} strokeWidth={1.75} />
            </Button>
          )}
        </div>
      </div>
      {a.intro && (
        <details className="group mt-4 border-t border-line pt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[13px] font-medium text-muted hover:text-fg [&::-webkit-details-marker]:hidden">
            <ChevronDown size={16} strokeWidth={1.75} className="transition-transform group-open:rotate-180" />
            {t("grading.instructions")}
          </summary>
          <RichText html={a.intro} className="mt-3" />
        </details>
      )}
    </Card>
  );
}
