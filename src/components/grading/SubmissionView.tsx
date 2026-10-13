"use client";
import { useState } from "react";
import { ChevronDown, FileX, History } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Badge, Card, CardHeader, EmptyState, RichText, cn } from "@/components/ui";
import type { AssignPlugin, AssignSubmission, SubmissionStatus } from "@/lib/moodle/types";
import { FileList } from "./FileList";
import { formatDateTime, formatGrade } from "./lib";

function onlineText(plugins?: AssignPlugin[]) {
  return plugins
    ?.find((p) => p.type === "onlinetext")
    ?.editorfields?.find((f) => f.name === "onlinetext")?.text;
}

function submissionFiles(plugins?: AssignPlugin[]) {
  return (
    plugins
      ?.find((p) => p.type === "file")
      ?.fileareas?.find((a) => a.area === "submission_files")?.files ?? []
  );
}

export function feedbackComments(plugins?: AssignPlugin[]) {
  return plugins
    ?.find((p) => p.type === "comments")
    ?.editorfields?.find((f) => f.name === "comments")?.text;
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
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">
            {t("grading.onlineText")}
          </h3>
          <div className="rounded-lg border border-line bg-surface-2 p-4">
            <RichText html={text} />
          </div>
        </section>
      )}
      {files.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">
            {t("grading.files")} ({files.length})
          </h3>
          <FileList files={files} />
        </section>
      )}
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="mt-0.5 text-sm text-fg">{children}</dd>
    </div>
  );
}

/** Selected student's latest submission, status details and previous attempts. */
export function SubmissionView({
  status,
  submission,
  duedate,
  gradeType,
  scale,
  groupName,
}: {
  status: SubmissionStatus;
  submission: AssignSubmission | null;
  duedate: number;
  gradeType: number;
  scale: string[] | null | undefined;
  groupName?: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const extension = status.lastattempt?.extensionduedate ?? 0;
  const deadline = extension || duedate;
  const submitted = submission && submission.status !== "new";
  const late =
    submission?.status === "submitted" && deadline > 0 && submission.timemodified > deadline;
  const previous = [...(status.previousattempts ?? [])].sort(
    (a, b) => b.attemptnumber - a.attemptnumber
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={t("grading.submission")}
          action={
            submission && (
              <div className="flex items-center gap-2">
                {late && <Badge tone="danger">{t("grading.late")}</Badge>}
                <Badge tone="neutral">
                  {t("grading.attempt", { n: submission.attemptnumber + 1 })}
                </Badge>
              </div>
            )
          }
        />
        <div className="space-y-5 p-5">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
            <EmptyState
              compact
              icon={FileX}
              title={t("grading.nothingSubmitted")}
              hint={t("grading.canStillGrade")}
            />
          )}
        </div>
      </Card>

      {previous.length > 0 && (
        <Card>
          <CardHeader title={t("grading.previousAttempts")} />
          <div className="divide-y divide-line">
            {previous.map((p) => (
              <PreviousAttempt
                key={p.attemptnumber}
                attempt={p}
                gradeLabel={formatGrade(p.grade?.grade, { grade: gradeType }, scale)}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function submissionStatusKey(s: string) {
  return s === "draft" || s === "reopened" || s === "submitted" ? s : "notSubmitted";
}

function PreviousAttempt({
  attempt,
  gradeLabel,
}: {
  attempt: NonNullable<SubmissionStatus["previousattempts"]>[number];
  gradeLabel: string | null;
}) {
  const t = useT();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const feedback = feedbackComments(attempt.feedbackplugins);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-2"
      >
        <History size={16} strokeWidth={1.75} className="shrink-0 text-subtle" />
        <span className="flex-1 text-sm font-medium text-fg">
          {t("grading.attempt", { n: attempt.attemptnumber + 1 })}
          {attempt.submission?.timemodified ? (
            <span className="ml-2 text-xs font-normal text-subtle">
              {formatDateTime(attempt.submission.timemodified, locale)}
            </span>
          ) : null}
        </span>
        <span className="text-xs font-medium tabular-nums text-muted">{gradeLabel ?? "—"}</span>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          className={cn("text-subtle transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="space-y-4 px-5 pb-5">
          {attempt.submission ? (
            <SubmissionContent submission={attempt.submission} />
          ) : (
            <p className="text-sm text-subtle">{t("grading.emptySubmission")}</p>
          )}
          {feedback && (
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">
                {t("grading.feedback")}
              </h3>
              <RichText html={feedback} className="rounded-lg border border-line p-4" />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
