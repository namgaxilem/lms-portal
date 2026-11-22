"use client";
import type { Ref } from "react";
import { FilePlus2, FileUp, Hourglass, LoaderCircle, Lock, Pencil, Play, Trash2 } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Button, Card, CardHeader, EmptyState, IconTile, RichText } from "@/components/ui";
import type { Assignment } from "@/lib/moodle/types";
import { formatDuration } from "@/lib/format";
import { FileList } from "@/components/FileList";
import { formatWhen, onlineText, submissionFiles } from "./lib";
import type { AssignmentState } from "./state";

export type BusyAction = "start" | "submit" | "remove";

const spinner = <LoaderCircle size={16} strokeWidth={1.85} className="animate-spin" />;

/** Gate before a timed attempt: the timer starts on Start and can't be paused. */
function TimedStart({ timelimit, busy, onStart }: { timelimit: number; busy: BusyAction | null; onStart: () => void }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-warning-soft px-4 py-8 text-center">
      <IconTile icon={Hourglass} tone="warning" solid size="lg" />
      <div>
        <p className="text-base font-bold text-fg">{t("assignment.timed.title", { time: formatDuration(timelimit, t) })}</p>
        <p className="mx-auto mt-1 max-w-md text-[13px] text-muted">{t("assignment.timed.hint")}</p>
      </div>
      <Button variant="gradient" onClick={onStart} disabled={busy !== null}>
        {busy === "start" ? spinner : <Play size={16} strokeWidth={1.85} />}
        {t("assignment.timed.start")}
      </Button>
    </div>
  );
}

/** The student's current submission with its edit / remove / start actions. */
export function SubmissionCard({
  headingRef,
  assignment: a,
  state: s,
  hasAttemptInfo,
  canRemove,
  busy,
  onEdit,
  onStart,
  onRemove,
}: {
  /** Focus target (the card title) for when the editor closes. */
  headingRef?: Ref<HTMLSpanElement>;
  assignment: Assignment;
  state: AssignmentState;
  /** Moodle returned lastattempt (the user may view their submission summary). */
  hasAttemptInfo: boolean;
  canRemove: boolean;
  busy: BusyAction | null;
  onEdit: () => void;
  onStart: () => void;
  onRemove: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const text = onlineText(s.sub?.plugins);
  const files = submissionFiles(s.sub?.plugins);
  const hasContent = !!text || files.length > 0;

  const blockedReason = s.notOpen
    ? t("assignment.blocked.notOpen", { date: formatWhen(a.allowsubmissionsfromdate, locale) })
    : s.locked
      ? t("assignment.blocked.locked")
      : s.closed
        ? t("assignment.blocked.closed")
        : hasAttemptInfo && !s.canEdit && !s.submitted
          ? t("assignment.blocked.generic")
          : null;

  const actions =
    s.canEdit && !s.needsStart && hasContent ? (
      <div className="flex items-center gap-1.5">
        {canRemove && (
          <Button
            variant="ghost"
            onClick={onRemove}
            disabled={busy !== null}
            aria-label={t("assignment.remove.action")}
            title={t("assignment.remove.action")}
          >
            {busy === "remove" ? spinner : <Trash2 size={16} strokeWidth={1.85} />}
            <span className="hidden sm:inline">{t("assignment.remove.action")}</span>
          </Button>
        )}
        <Button variant="secondary" onClick={onEdit} disabled={busy !== null}>
          <Pencil size={16} strokeWidth={1.85} />
          {t("assignment.edit")}
        </Button>
      </div>
    ) : undefined;

  return (
    <Card>
      <CardHeader
        title={
          <span ref={headingRef} tabIndex={-1} className="flex items-center gap-3 rounded-lg">
            <IconTile icon={FileUp} tone="primary" size="sm" />
            {t("assignment.yourSubmission")}
          </span>
        }
        description={
          s.sub?.timemodified && hasContent
            ? t("assignment.lastModified", { date: formatWhen(s.sub.timemodified, locale) })
            : undefined
        }
        action={actions}
        className="flex-wrap"
      />
      <div className="space-y-4 p-5">
        {s.needsStart ? (
          <TimedStart timelimit={s.timelimit} busy={busy} onStart={onStart} />
        ) : hasContent ? (
          <>
            {text && (
              <div>
                <h3 className="mb-2 text-[13px] font-bold text-muted">{t("assignment.onlineText")}</h3>
                <div className="rounded-2xl bg-surface-2 p-4">
                  <RichText html={text.text} />
                </div>
              </div>
            )}
            {files.length > 0 && (
              <div>
                <h3 className="mb-2 text-[13px] font-bold text-muted">{t("assignment.files")}</h3>
                <FileList files={files} />
              </div>
            )}
            {blockedReason && (
              <p className="flex items-center gap-2 text-[13px] text-subtle">
                <Lock size={14} strokeWidth={1.85} aria-hidden />
                {blockedReason}
              </p>
            )}
          </>
        ) : (
          <EmptyState
            compact
            icon={s.canEdit ? FilePlus2 : Lock}
            title={t("assignment.noSubmission")}
            hint={blockedReason ?? (s.canEdit ? t("assignment.noSubmissionHint") : undefined)}
            action={
              s.canEdit ? (
                <Button variant="gradient" onClick={onEdit} disabled={busy !== null}>
                  <FilePlus2 size={16} strokeWidth={1.85} />
                  {t("assignment.add")}
                </Button>
              ) : undefined
            }
          />
        )}
      </div>
    </Card>
  );
}
