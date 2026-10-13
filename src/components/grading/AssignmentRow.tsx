"use client";
import Link from "next/link";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import { useMoodle } from "@/lib/client-api";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Badge, Skeleton } from "@/components/ui";
import type { Assignment, SubmissionStatus } from "@/lib/moodle/types";
import { formatDateTime } from "./lib";

/** One assignment in the grading list, with live submission counts. */
export function AssignmentRow({
  assignment: a,
  now,
  courseid,
}: {
  assignment: Assignment;
  now: number;
  courseid: number;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { data, loading } = useMoodle<SubmissionStatus>("mod_assign_get_submission_status", {
    assignid: a.id,
  });
  const summary = data?.gradingsummary;
  const overdue = a.duedate > 0 && a.duedate < now;

  return (
    <Link
      href={`/teacher/grading/${a.cmid}?course=${courseid}`}
      className="group flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-muted">
          <ClipboardCheck size={18} strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-fg">{a.name}</p>
          <p className="mt-0.5 text-xs tabular-nums text-subtle">
            {t("grading.due")}: {a.duedate ? formatDateTime(a.duedate, locale) : "—"}
            {a.grade > 0 && ` · ${t("grading.max")} ${a.grade}`}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 pl-12 sm:pl-0">
        {loading ? (
          <Skeleton className="h-6 w-40" />
        ) : summary ? (
          <>
            <Badge tone={summary.submissionsneedgradingcount > 0 ? "warning" : "neutral"}>
              {t("grading.needsGradingCount", { n: summary.submissionsneedgradingcount })}
            </Badge>
            <span className="text-xs tabular-nums text-subtle">
              {t("grading.submittedOf", {
                n: summary.submissionssubmittedcount,
                total: summary.participantcount,
              })}
            </span>
          </>
        ) : null}
        {overdue && (
          <Badge tone="danger" dot>
            {t("grading.overdue")}
          </Badge>
        )}
        <ChevronRight
          size={16}
          strokeWidth={1.75}
          className="hidden text-subtle transition-transform group-hover:translate-x-0.5 sm:block"
        />
      </div>
    </Link>
  );
}
