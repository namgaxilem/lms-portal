"use client";
import { useState } from "react";
import { ChevronDown, MessageSquareText } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Badge, Card, CardHeader, RichText, cn } from "@/components/ui";
import type { SubmissionStatus } from "@/lib/moodle/types";
import { FileList } from "./FileList";
import {
  feedbackComments,
  feedbackFiles,
  formatDateTime,
  onlineText,
  rawGrade,
  submissionFiles,
} from "./lib";
import { StatusBadge } from "./StatusBadge";

/** Grade + teacher feedback for the latest attempt. Renders nothing without feedback. */
export function FeedbackCard({ feedback }: { feedback: SubmissionStatus["feedback"] }) {
  const t = useT();
  const { locale } = useLocale();
  if (!feedback) return null;
  const comments = feedbackComments(feedback.plugins);
  const files = feedbackFiles(feedback.plugins);
  const graded = rawGrade(feedback.grade?.grade) !== null;
  if (!graded && !comments && !files.length) return null;

  return (
    <Card>
      <CardHeader
        title={t("assignment.feedback.title")}
        description={
          feedback.gradeddate
            ? t("assignment.feedback.gradedOn", {
                date: formatDateTime(feedback.gradeddate, locale),
              })
            : undefined
        }
      />
      <div className="space-y-5 p-5">
        {graded && feedback.gradefordisplay && (
          <div className="flex items-center gap-4 rounded-lg bg-success-soft px-4 py-3">
            <span className="text-[13px] font-medium text-muted">
              {t("assignment.feedback.grade")}
            </span>
            <RichText
              html={feedback.gradefordisplay}
              className="text-xl font-semibold tabular-nums text-success"
            />
          </div>
        )}
        {comments && (
          <div>
            <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-muted">
              <MessageSquareText size={16} strokeWidth={1.75} />
              {t("assignment.feedback.comments")}
            </p>
            <RichText html={comments} />
          </div>
        )}
        {files.length > 0 && (
          <div>
            <p className="mb-2 text-[13px] font-medium text-muted">
              {t("assignment.feedback.files")}
            </p>
            <FileList files={files} />
          </div>
        )}
      </div>
    </Card>
  );
}

/** Collapsible list of earlier attempts (submission + grade + feedback). */
export function PreviousAttempts({
  attempts,
}: {
  attempts: NonNullable<SubmissionStatus["previousattempts"]>;
}) {
  const t = useT();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  if (!attempts.length) return null;
  const sorted = [...attempts].sort((a, b) => b.attemptnumber - a.attemptnumber);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left"
      >
        <span className="text-sm font-semibold text-fg">
          {t("assignment.previous.title", { n: attempts.length })}
        </span>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          className={cn("text-subtle transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="divide-y divide-line border-t border-line">
          {sorted.map((a) => {
            const text = onlineText(a.submission?.plugins);
            const files = submissionFiles(a.submission?.plugins);
            const grade = rawGrade(a.grade?.grade);
            const comments = feedbackComments(a.feedbackplugins);
            const fbFiles = feedbackFiles(a.feedbackplugins);
            return (
              <div key={a.attemptnumber} className="space-y-3 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-fg">
                    {t("assignment.previous.attempt", { n: a.attemptnumber + 1 })}
                  </span>
                  {a.submission && <StatusBadge status={a.submission.status} />}
                  {grade !== null && (
                    <Badge tone="success">
                      {t("assignment.previous.grade", { grade: Number(grade.toFixed(2)) })}
                    </Badge>
                  )}
                  {a.submission?.timemodified ? (
                    <span className="text-xs text-subtle">
                      {formatDateTime(a.submission.timemodified, locale)}
                    </span>
                  ) : null}
                </div>
                {text && (
                  <div className="rounded-lg border border-line bg-surface-2 p-3">
                    <RichText html={text.text} plain={text.format === 2} />
                  </div>
                )}
                <FileList files={files} />
                {comments && (
                  <div>
                    <p className="mb-1 text-[13px] font-medium text-muted">
                      {t("assignment.feedback.comments")}
                    </p>
                    <RichText html={comments} />
                  </div>
                )}
                <FileList files={fbFiles} />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
