"use client";
import { useState, type ReactNode } from "react";
import { ChevronDown, FileX, History } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Badge, Card, CardHeader, EmptyState, RichText, cn } from "@/components/ui";
import { feedbackComments, feedbackFiles, onlineText, submissionFiles } from "@/components/assignment/lib";
import { formatDateTime } from "@/lib/format";
import type { AssignSubmission, SubmissionStatus } from "@/lib/moodle/types";
import { FileList } from "@/components/FileList";

type PreviousAttemptData = NonNullable<SubmissionStatus["previousattempts"]>[number];

function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-subtle">{children}</h3>;
}

/** Online text + files of one submission attempt. */
function SubmissionContent({ submission }: { submission: AssignSubmission }) {
  const t = useT();
  const text = onlineText(submission.plugins);
  const files = submissionFiles(submission.plugins);
  if (!text && files.length === 0) {
    return <p className="text-sm text-subtle">{t("grading.emptySubmission")}</p>;
  }
  return (
    <div className="space-y-4">
      {text && (
        <section>
          <SectionLabel>{t("grading.onlineText")}</SectionLabel>
          <div className="rounded-control border border-line bg-surface-2 p-4">
            <RichText html={text.text} />
          </div>
        </section>
      )}
      {files.length > 0 && (
        <section>
          <SectionLabel>
            {t("grading.files")} <span className="tabular-nums">({files.length})</span>
          </SectionLabel>
          <FileList files={files} />
        </section>
      )}
    </div>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-control bg-surface-2 px-3 py-2.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-subtle">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-fg">{children}</dd>
    </div>
  );
}

function submissionStatusKey(s: string) {
  return s === "draft" || s === "reopened" || s === "submitted" ? s : "notSubmitted";
}

/** Selected student's latest submission, status details and previous attempts. */
export function SubmissionView({
  status,
  submission,
  duedate,
  gradeLabelFor,
  groupName,
}: {
  status: SubmissionStatus;
  submission: AssignSubmission | undefined;
  duedate: number;
  /** Formats a raw grade of a previous attempt. */
  gradeLabelFor: (raw: string | undefined) => string | null;
  groupName?: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const extension = status.lastattempt?.extensionduedate ?? 0;
  const deadline = extension || duedate;
  const submitted = !!submission && submission.status !== "new";
  const late = submission?.status === "submitted" && deadline > 0 && submission.timemodified > deadline;
  const previous = [...(status.previousattempts ?? [])].sort((a, b) => b.attemptnumber - a.attemptnumber);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={t("grading.submission")}
          action={
            submission && (
              <div className="flex items-center gap-1.5">
                {late && (
                  <Badge tone="danger" dot>
                    {t("grading.late")}
                  </Badge>
                )}
                <Badge tone="neutral">{t("grading.attempt", { n: submission.attemptnumber + 1 })}</Badge>
              </div>
            )
          }
        />
        <div className="space-y-5 p-5">
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Meta label={t("grading.statusLabel")}>
              {t(`grading.status.${submitted ? submissionStatusKey(submission.status) : "notSubmitted"}`)}
            </Meta>
            <Meta label={t("grading.lastModified")}>
              {submitted ? formatDateTime(submission.timemodified, locale) : "—"}
            </Meta>
            <Meta label={extension ? t("grading.extensionDue") : t("grading.due")}>
              {deadline ? formatDateTime(deadline, locale) : "—"}
            </Meta>
            {groupName && <Meta label={t("grading.group")}>{groupName}</Meta>}
          </dl>
          {submitted ? (
            <SubmissionContent submission={submission} />
          ) : (
            <EmptyState compact icon={FileX} title={t("grading.nothingSubmitted")} hint={t("grading.canStillGrade")} />
          )}
        </div>
      </Card>

      {previous.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader title={t("grading.previousAttempts")} />
          <div className="mt-3 divide-y divide-line border-t border-line">
            {previous.map((p) => (
              <PreviousAttempt key={p.attemptnumber} attempt={p} gradeLabel={gradeLabelFor(p.grade?.grade)} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function PreviousAttempt({ attempt, gradeLabel }: { attempt: PreviousAttemptData; gradeLabel: string | null }) {
  const t = useT();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const feedback = feedbackComments(attempt.feedbackplugins);
  // Only the feedback files and the annotated PDF; editpdf's page images, stamps and tmp areas are internal.
  const files = feedbackFiles(attempt.feedbackplugins);
  const panelId = `attempt-${attempt.attemptnumber}`;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
      >
        <History size={16} strokeWidth={1.85} className="shrink-0 text-subtle" aria-hidden />
        <span className="min-w-0 flex-1 text-sm font-semibold text-fg">
          {t("grading.attempt", { n: attempt.attemptnumber + 1 })}
          {attempt.submission?.timemodified ? (
            <span className="ml-2 text-xs font-normal tabular-nums text-subtle">
              {formatDateTime(attempt.submission.timemodified, locale)}
            </span>
          ) : null}
        </span>
        <span className="text-xs font-bold tabular-nums text-muted">{gradeLabel ?? "—"}</span>
        <ChevronDown
          size={16}
          strokeWidth={1.85}
          aria-hidden
          className={cn("text-subtle transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div id={panelId} className="space-y-4 px-5 pb-5">
          {attempt.submission ? (
            <SubmissionContent submission={attempt.submission} />
          ) : (
            <p className="text-sm text-subtle">{t("grading.emptySubmission")}</p>
          )}
          {(feedback || files.length > 0) && (
            <section>
              <SectionLabel>{t("grading.feedback")}</SectionLabel>
              <div className="space-y-3">
                {feedback && <RichText html={feedback} className="rounded-control border border-line p-4" />}
                {files.length > 0 && <FileList files={files} />}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
