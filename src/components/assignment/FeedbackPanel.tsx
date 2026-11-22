"use client";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Award, ChevronDown, History, MessageSquareText } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Card, CardHeader, IconTile, RichText, cn } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type { Assignment, SubmissionStatus } from "@/lib/moodle/types";
import { FileList } from "@/components/FileList";
import {
  feedbackComments,
  feedbackFiles,
  formatWhen,
  gradeHtml,
  gradeLabel,
  onlineText,
  rawGrade,
  submissionFiles,
} from "./lib";
import { StatusBadge } from "./StatusBadge";

type PreviousAttempt = NonNullable<SubmissionStatus["previousattempts"]>[number];

/**
 * Styles Moodle's rubric / marking-guide markup (frozen gradingform tables)
 * that advanced grading puts into a rendered grade.
 */
const ADVANCED_GRADE = cn(
  "overflow-x-auto",
  "[&_table]:w-full [&_table]:border-collapse [&_table]:text-[13px]",
  "[&_td]:border [&_td]:border-line [&_td]:p-2.5 [&_td]:align-top",
  "[&_td.levels]:border-0 [&_td.levels]:p-0 [&_.description]:font-semibold [&_.criterionname]:font-semibold",
  // The chosen rubric level: outline and weight as well as colour.
  "[&_.level.checked]:bg-success-soft [&_.level.checked]:font-bold [&_.level.checked]:text-success-text",
  "[&_.level.checked]:outline-2 [&_.level.checked]:-outline-offset-2 [&_.level.checked]:outline-success",
  // A rubric level's points are secondary; a guide's td.score is the awarded mark and keeps full size.
  "[&_.level_.score]:mt-1 [&_.level_.score]:text-xs [&_.level_.score]:text-subtle",
  "[&_.level.checked_.score]:text-success-text [&_.remark]:text-muted"
);

/**
 * A grade as Moodle rendered it: a plain grade (points, scale item) large on
 * a success strip; rubric / marking-guide markup on a neutral surface.
 */
function GradeBlock({ html, size }: { html: string; size: "lg" | "md" }) {
  const t = useT();
  const label = gradeLabel(html);
  if (label) {
    return (
      <div className={cn("flex items-center gap-4 rounded-2xl bg-success-soft", size === "lg" ? "p-4" : "px-4 py-3")}>
        {size === "lg" && <IconTile icon={Award} tone="success" solid />}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-success-text">{t("assignment.feedback.grade")}</p>
          <p className={cn("font-extrabold tabular-nums text-fg", size === "lg" ? "text-2xl" : "text-lg")}>{label}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl p-4 ring-1 ring-line">
      <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-success-text">
        <Award size={16} strokeWidth={1.85} aria-hidden />
        {t("assignment.feedback.grade")}
      </p>
      <RichText html={html} className={ADVANCED_GRADE} />
    </div>
  );
}

function SubHeading({
  icon: Icon,
  as: Tag = "h3",
  children,
}: {
  icon?: LucideIcon;
  as?: "h3" | "h4";
  children: React.ReactNode;
}) {
  return (
    <Tag className="mb-2 flex items-center gap-2 text-[13px] font-bold text-muted">
      {Icon && <Icon size={16} strokeWidth={1.85} aria-hidden />}
      {children}
    </Tag>
  );
}

/**
 * Grade and teacher feedback for the latest attempt. Moodle only sends
 * `feedback` once it is visible to the student (released, not hidden).
 */
export function FeedbackCard({ feedback }: { feedback: SubmissionStatus["feedback"] }) {
  const t = useT();
  const { locale } = useLocale();
  if (!feedback) return null;
  const grade = gradeHtml(feedback.gradefordisplay);
  const comments = feedbackComments(feedback.plugins);
  const files = feedbackFiles(feedback.plugins);
  if (!grade && !comments && !files.length) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={t("assignment.feedback.title")}
        description={
          feedback.gradeddate
            ? t("assignment.feedback.gradedOn", { date: formatWhen(feedback.gradeddate, locale) })
            : undefined
        }
      />
      <div className="space-y-5 p-5">
        {grade && <GradeBlock html={grade} size="lg" />}
        {comments && (
          <div>
            <SubHeading icon={MessageSquareText}>{t("assignment.feedback.comments")}</SubHeading>
            <RichText html={comments} />
          </div>
        )}
        {files.length > 0 && (
          <div>
            <SubHeading>{t("assignment.feedback.files")}</SubHeading>
            <FileList files={files} />
          </div>
        )}
      </div>
    </Card>
  );
}

/** One earlier attempt: submission, grade and feedback. */
function AttemptItem({ attempt, assignment }: { attempt: PreviousAttempt; assignment: Assignment }) {
  const t = useT();
  const { locale } = useLocale();
  const text = onlineText(attempt.submission?.plugins);
  const files = submissionFiles(attempt.submission?.plugins);
  const comments = feedbackComments(attempt.feedbackplugins);
  const fbFiles = feedbackFiles(attempt.feedbackplugins);
  const raw = rawGrade(attempt.grade?.grade);
  // Moodle renders the grade (scale item, "x / max", or the rubric); without it
  // only the raw number is known, which is meaningful for points only.
  const grade =
    raw === null
      ? null
      : (gradeHtml(attempt.grade?.gradefordisplay) ??
        (assignment.grade > 0 ? `${formatNumber(raw, locale)} / ${formatNumber(assignment.grade, locale)}` : null));

  return (
    <li className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold text-fg">{t("assignment.previous.attempt", { n: attempt.attemptnumber + 1 })}</h3>
        {attempt.submission && <StatusBadge status={attempt.submission.status} />}
        {attempt.submission?.timemodified ? (
          <span className="text-xs text-subtle">{formatWhen(attempt.submission.timemodified, locale)}</span>
        ) : null}
      </div>
      {grade && <GradeBlock html={grade} size="md" />}
      {text && (
        <div className="rounded-2xl bg-surface-2 p-4">
          <RichText html={text.text} />
        </div>
      )}
      <FileList files={files} />
      {comments && (
        <div>
          <SubHeading icon={MessageSquareText} as="h4">
            {t("assignment.feedback.comments")}
          </SubHeading>
          <RichText html={comments} />
        </div>
      )}
      <FileList files={fbFiles} />
    </li>
  );
}

/** Collapsible list of earlier attempts (Moodle sends them newest first). */
export function PreviousAttempts({
  attempts,
  assignment,
}: {
  attempts: PreviousAttempt[];
  assignment: Assignment;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (!attempts.length) return null;

  return (
    <Card className="overflow-hidden">
      <h2>
        {/* Inset focus outline: the card's overflow-hidden would clip an outer one. */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="assign-previous-attempts"
          className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-2 focus-visible:-outline-offset-2"
        >
          <IconTile icon={History} tone="violet" size="sm" />
          <span className="flex-1 text-base font-bold text-fg">
            {t("assignment.previous.title", { n: attempts.length })}
          </span>
          <ChevronDown
            size={20}
            strokeWidth={1.85}
            aria-hidden
            className={cn("text-subtle transition-transform", open && "rotate-180")}
          />
        </button>
      </h2>
      {open && (
        <ul id="assign-previous-attempts" className="divide-y divide-line border-t border-line">
          {attempts.map((a) => (
            <AttemptItem key={a.attemptnumber} attempt={a} assignment={assignment} />
          ))}
        </ul>
      )}
    </Card>
  );
}
