"use client";
import { useId, useRef, useState } from "react";
import { App, Select } from "antd";
import { CircleAlert, LoaderCircle, Save, SkipForward } from "lucide-react";
import { moodleClient } from "@/lib/client-api";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Badge, Button, Card, CardHeader, Label, cn, inputClass } from "@/components/ui";
import {
  annotatedPdfs,
  feedbackComments,
  feedbackFileArea,
  htmlToText,
  isRichHtml,
  rawGrade,
  textToHtml,
} from "@/components/assignment/lib";
import type { Assignment, SubmissionStatus } from "@/lib/moodle/types";
import { formatNumber } from "@/lib/format";
import { FeedbackField } from "./FeedbackField";
import { FeedbackFiles, uploadFeedbackFiles, type FeedbackFilesDraft } from "./FeedbackFiles";
import { FileList } from "@/components/FileList";
import { FrequentComments } from "./FrequentComments";
import { GradingNotice, serviceNoticeIndex } from "./GradingNotice";
import { GuideForm } from "./GuideForm";
import { RubricGrid } from "./RubricGrid";
import {
  buildSavePayload,
  feedbackPluginEnabled,
  gradeNotices,
  gradeTypeOf,
  guideScore,
  inputNumber,
  isAdvancedBlocked,
  restorePluginfileUrls,
  rubricTotals,
  workflowOptions,
  workflowStateOf,
  type GuideValue,
  type RubricValue,
} from "./lib";
import type { GradingFillingsResult, GradingSetup, SaveOutcome } from "./types";

type CommentTarget = "feedback" | number;

export interface SavedResult {
  next: boolean;
  /** Grade sent as a plain value (points / scale), null for advanced grading or no grade. */
  grade: number | null;
}

/**
 * Grade + feedback for one participant. Mount with `key={userid}` so the
 * initial values are re-read when the teacher switches student.
 */
export function GradeForm({
  assignment,
  setup,
  fillings,
  currentGrade,
  userid,
  status,
  team,
  hasNext,
  methodBlocked,
  gradeLocked,
  feedbackHidden,
  canRelease,
  onDirty,
  onSaved,
}: {
  assignment: Assignment;
  setup: GradingSetup;
  /** Saved rubric / guide fillings (advanced grading only). */
  fillings: GradingFillingsResult | null;
  /** Raw grade of the latest attempt (mod_assign_get_grades), if any. */
  currentGrade: string | undefined;
  userid: number;
  status: SubmissionStatus;
  team: boolean;
  hasNext: boolean;
  /** Moodle ignored a plain grade earlier: the assignment probably uses advanced grading. */
  methodBlocked: boolean;
  /** Moodle kept this student's grade because it is locked / overridden in the gradebook. */
  gradeLocked: boolean;
  /** Marking workflow not released: Moodle hides the saved feedback from the web service. */
  feedbackHidden: boolean;
  /** May set "in review", "ready for release" and "released" (see workflowOptions). */
  canRelease: boolean;
  onDirty: (dirty: boolean) => void;
  /** Refreshes the workspace and reports whether Moodle applied the plain grade. */
  onSaved: (result: SavedResult) => Promise<SaveOutcome>;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { message, modal } = App.useApp();
  const ids = useId();
  const formRef = useRef<HTMLDivElement>(null);

  const gradeType = gradeTypeOf(assignment);
  const current = rawGrade(currentGrade);
  const maxgrade = setup.maxgrade;
  const rubric = setup.method === "rubric" ? setup.rubric : undefined;
  const guide = setup.method === "guide" ? setup.guide : undefined;
  const advancedBlocked = isAdvancedBlocked(setup, fillings, methodBlocked);
  const plainGrading = !rubric && !guide;
  const scaleBlocked = plainGrading && gradeType === "scale" && !setup.scale?.length;

  const commentsOn = feedbackPluginEnabled(assignment, "comments");
  const filesOn = feedbackPluginEnabled(assignment, "file");
  const replacesHidden = feedbackHidden && (commentsOn || filesOn);
  const originalHtml = feedbackComments(status.feedback?.plugins) ?? "";
  const richFeedback = isRichHtml(originalHtml);
  const currentFiles = feedbackFileArea(status.feedback?.plugins);
  const annotated = annotatedPdfs(status.feedback?.plugins);

  const notices = gradeNotices({
    setup,
    methodBlocked,
    advancedBlocked,
    scaleBlocked,
    gradeLocked,
    feedbackHidden: replacesHidden,
  });
  const issueAt = serviceNoticeIndex(notices);
  const hiddenNoticeId = notices.includes("feedbackHidden") ? `${ids}-hidden` : undefined;

  const [points, setPoints] = useState(() => (current !== null && gradeType === "points" ? inputNumber(current) : ""));
  const [scaleIdx, setScaleIdx] = useState<number>(() =>
    current !== null && gradeType === "scale" ? Math.round(current) : -1
  );
  const [rubricValue, setRubricValue] = useState<RubricValue>(() =>
    Object.fromEntries((fillings?.fillings ?? []).map((f) => [f.criterionid, { levelid: f.levelid, remark: f.remark ?? "" }]))
  );
  const [guideValue, setGuideValue] = useState<GuideValue>(() =>
    Object.fromEntries(
      (fillings?.fillings ?? []).map((f) => [
        f.criterionid,
        { score: f.score !== undefined ? inputNumber(f.score) : "", remark: f.remark ?? "" },
      ])
    )
  );
  const [editingFeedback, setEditingFeedback] = useState(!richFeedback);
  const [feedback, setFeedback] = useState(() => (richFeedback ? "" : htmlToText(originalHtml)));
  const [feedbackTouched, setFeedbackTouched] = useState(false);
  const [filesDraft, setFilesDraft] = useState<FeedbackFilesDraft | null>(null);
  const savedWorkflow = workflowStateOf(status.lastattempt?.gradingstatus);
  const [workflow, setWorkflow] = useState(savedWorkflow);
  const [commentTarget, setCommentTarget] = useState<CommentTarget>("feedback");
  const [saving, setSaving] = useState<false | "save" | "next">(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [pointsInvalid, setPointsInvalid] = useState(false);

  // Wrap setters so any edit marks the form dirty.
  const edit =
    <V,>(setter: (v: V) => void) =>
    (v: V) => {
      setter(v);
      setError(null);
      onDirty(true);
    };
  const editFeedback = (text: string) => {
    setFeedbackTouched(true);
    edit(setFeedback)(text);
  };
  const startEditingFeedback = () => {
    setFeedback(htmlToText(originalHtml));
    setEditingFeedback(true);
  };

  const appendComment = (text: string) => {
    if (commentTarget === "feedback") {
      editFeedback(feedback ? `${feedback}\n${text}` : text);
      return;
    }
    const target = commentTarget;
    edit(setGuideValue)((prev: GuideValue) => {
      const cur = prev[target] ?? { score: "", remark: "" };
      return { ...prev, [target]: { ...cur, remark: cur.remark ? `${cur.remark}\n${text}` : text } };
    });
  };

  /** Moves focus to the first criterion / field flagged after a failed save. */
  const focusFirstInvalid = () =>
    requestAnimationFrame(() =>
      formRef.current?.querySelector<HTMLElement>('[data-invalid] input, input[aria-invalid="true"]')?.focus()
    );

  /**
   * Marking workflow hides earlier feedback from the web service, so this form
   * can't show it and saving replaces it (even with an empty box): confirm first.
   */
  const confirmReplaceHidden = () =>
    modal.confirm({
      title: t("grading.replaceConfirm.title"),
      content: t("grading.replaceConfirm.body"),
      okText: t("grading.replaceConfirm.ok"),
      cancelText: t("grading.keepEditing"),
      okButtonProps: { danger: true },
    });

  const save = async (next: boolean) => {
    const payload = buildSavePayload({
      assignment,
      userid,
      team,
      rubric,
      guide,
      rubricValue,
      guideValue,
      scaleBlocked,
      scaleIdx,
      points,
      maxgrade,
      current,
      workflow,
      // Untouched feedback goes back as it was (files restored), so Moodle sees no change.
      feedbackHtml: commentsOn ? (feedbackTouched ? textToHtml(feedback) : restorePluginfileUrls(originalHtml)) : null,
    });
    if ("error" in payload) {
      setShowErrors(true);
      setPointsInvalid(payload.error === "grading.errors.pointsRange");
      setError(t(payload.error, { max: maxgrade !== null ? formatNumber(maxgrade, locale) : "" }));
      focusFirstInvalid();
      return;
    }
    if (replacesHidden && (commentsOn || filesDraft) && !(await confirmReplaceHidden())) return;

    setSaving(next ? "next" : "save");
    setError(null);
    try {
      if (filesOn && filesDraft) {
        const itemid = await uploadFeedbackFiles(filesDraft).catch(() => {
          throw new Error(t("grading.filesUploadFailed"));
        });
        (payload.args.plugindata as Record<string, unknown>).files_filemanager = itemid;
      }
      await moodleClient("mod_assign_save_grade", payload.args);
      onDirty(false);
      setShowErrors(false);
      // When Moodle kept another grade, a notice ("gradeLocked" / "notApplied") explains it instead of a toast.
      const outcome = await onSaved({ next, grade: payload.grade });
      setFilesDraft(null);
      if (outcome === "applied") message.success(t("grading.saved"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const busy = !!saving;
  const rubricSum = rubric ? rubricTotals(rubric.criteria, rubricValue) : null;
  const guideSum = guide
    ? {
        total: guide.criteria.reduce((s, c) => s + (guideScore(c, guideValue) ?? 0), 0),
        max: guide.criteria.reduce((s, c) => s + c.maxscore, 0),
      }
    : null;
  const advancedSum = rubricSum ?? guideSum;
  // Moodle's default (rubric "lock zero points" and every guide): total / max score × max grade.
  const estimate = maxgrade && advancedSum && advancedSum.max > 0 ? (advancedSum.total / advancedSum.max) * maxgrade : null;
  const advanced = rubric ?? guide;

  return (
    <Card>
      <CardHeader
        title={t("grading.gradeTitle")}
        action={
          current !== null ? (
            <Badge tone="success" dot>
              {t("grading.graded")}
            </Badge>
          ) : (
            <Badge tone="neutral">{t("grading.notGraded")}</Badge>
          )
        }
      />
      <div ref={formRef} className="space-y-5 p-5">
        {notices.map((kind, i) => (
          <GradingNotice
            key={kind}
            id={kind === "feedbackHidden" ? hiddenNoticeId : undefined}
            kind={kind}
            methodLabel={t(`grading.method.${setup.method === "guide" ? "guide" : "rubric"}`)}
            issue={i === issueAt ? (fillings?.issue ?? setup.issue) : undefined}
          />
        ))}

        {advanced && !advancedBlocked && (
          <section className="space-y-3" aria-labelledby={`${ids}-adv`}>
            <div className="flex items-baseline justify-between gap-3">
              <h3 id={`${ids}-adv`} className="text-sm font-bold text-fg">
                {advanced.name || t(rubric ? "grading.method.rubric" : "grading.method.guide")}
              </h3>
              {advancedSum && (
                <span className="text-xs font-semibold tabular-nums text-muted">
                  {t("grading.rubricTotal", {
                    total: formatNumber(advancedSum.total, locale),
                    max: formatNumber(advancedSum.max, locale),
                  })}
                </span>
              )}
            </div>
            {rubric && (
              <RubricGrid
                criteria={rubric.criteria}
                value={rubricValue}
                onChange={edit(setRubricValue)}
                disabled={busy}
                showErrors={showErrors}
              />
            )}
            {guide && (
              <GuideForm
                criteria={guide.criteria}
                value={guideValue}
                onChange={edit(setGuideValue)}
                onFocusRemark={setCommentTarget}
                disabled={busy}
                showErrors={showErrors}
              />
            )}
            {estimate !== null && maxgrade !== null && (
              <p className="rounded-control bg-surface-2 px-3 py-2 text-[13px] font-semibold tabular-nums text-muted">
                {t("grading.estimateApprox", { grade: formatNumber(estimate, locale), max: formatNumber(maxgrade, locale) })}
              </p>
            )}
          </section>
        )}

        {plainGrading && !advancedBlocked && gradeType === "points" && (
          <div>
            <Label htmlFor={`${ids}-points`}>
              {t("grading.gradeOutOf", { max: maxgrade !== null ? formatNumber(maxgrade, locale) : "—" })}
            </Label>
            <div className="w-40">
              <input
                id={`${ids}-points`}
                type="number"
                inputMode="decimal"
                min={0}
                max={maxgrade ?? undefined}
                step={0.01}
                value={points}
                onChange={(e) => {
                  setPointsInvalid(false);
                  edit(setPoints)(e.target.value);
                }}
                disabled={busy}
                aria-invalid={pointsInvalid || undefined}
                className={cn(inputClass, "font-bold tabular-nums")}
              />
            </div>
          </div>
        )}

        {plainGrading && !advancedBlocked && gradeType === "scale" && !scaleBlocked && (
          <div>
            <Label htmlFor={`${ids}-scale`}>{t("grading.scaleLabel")}</Label>
            <Select<number>
              id={`${ids}-scale`}
              className="w-full"
              value={scaleIdx}
              onChange={edit(setScaleIdx)}
              disabled={busy}
              options={[
                { value: -1, label: t("grading.noGrade") },
                ...(setup.scale ?? []).map((label, i) => ({ value: i + 1, label })),
              ]}
            />
          </div>
        )}

        {plainGrading && gradeType === "none" && (
          <p className="rounded-control bg-surface-2 px-3 py-2 text-[13px] text-muted">{t("grading.feedbackOnly")}</p>
        )}

        {!!assignment.markingworkflow && (
          <div>
            <Label htmlFor={`${ids}-workflow`}>{t("grading.workflowState")}</Label>
            <Select<string>
              id={`${ids}-workflow`}
              className="w-full"
              value={workflow}
              onChange={edit(setWorkflow)}
              disabled={busy || advancedBlocked}
              options={workflowOptions(savedWorkflow, canRelease).map((s) => ({
                value: s,
                label: t(`grading.workflow.${s}`),
              }))}
            />
          </div>
        )}

        {commentsOn && (
          <div className="space-y-2">
            <FeedbackField
              id={`${ids}-feedback`}
              originalHtml={originalHtml}
              rich={richFeedback}
              editing={editingFeedback}
              onStartEditing={startEditingFeedback}
              value={feedback}
              onChange={editFeedback}
              onFocus={() => setCommentTarget("feedback")}
              disabled={busy || advancedBlocked}
              describedBy={hiddenNoticeId}
            />
            {guide && guide.comments.length > 0 && !advancedBlocked && (
              <FrequentComments
                comments={guide.comments}
                target={
                  commentTarget === "feedback"
                    ? null
                    : (guide.criteria.find((c) => c.id === commentTarget)?.shortname ?? null)
                }
                disabled={busy || (commentTarget === "feedback" && !editingFeedback)}
                onPick={appendComment}
              />
            )}
          </div>
        )}

        {filesOn && !advancedBlocked && (
          <FeedbackFiles current={currentFiles} draft={filesDraft} onChange={edit(setFilesDraft)} disabled={busy} />
        )}

        {annotated.length > 0 && (
          <div className="space-y-2">
            <p className="text-[13px] font-medium text-fg">{t("grading.annotatedPdf")}</p>
            <FileList files={annotated} />
          </div>
        )}

        {error && (
          <div role="alert" className="flex gap-2 rounded-control bg-error-soft p-3 text-[13px] text-error-text">
            <CircleAlert size={16} strokeWidth={1.85} className="mt-0.5 shrink-0" aria-hidden />
            <p>{error}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant={hasNext ? "secondary" : "gradient"}
            onClick={() => save(false)}
            disabled={busy || advancedBlocked}
          >
            {saving === "save" ? (
              <LoaderCircle size={16} strokeWidth={1.85} className="animate-spin" />
            ) : (
              <Save size={16} strokeWidth={1.85} />
            )}
            {t("grading.save")}
          </Button>
          {hasNext && (
            <Button variant="gradient" onClick={() => save(true)} disabled={busy || advancedBlocked}>
              {saving === "next" ? (
                <LoaderCircle size={16} strokeWidth={1.85} className="animate-spin" />
              ) : (
                <SkipForward size={16} strokeWidth={1.85} />
              )}
              {t("grading.saveNext")}
            </Button>
          )}
        </div>
        {team && <p className="text-xs text-subtle">{t("grading.teamNote")}</p>}
      </div>
    </Card>
  );
}
