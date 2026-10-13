"use client";
import { useState } from "react";
import { App, Select } from "antd";
import { CircleAlert, LoaderCircle, Save, SkipForward, TriangleAlert } from "lucide-react";
import { moodleClient } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { Badge, Button, Card, CardHeader, Label, cn } from "@/components/ui";
import type { Assignment, GradingMeta, SubmissionStatus } from "@/lib/moodle/types";
import { GuideForm, guideScore, type GuideValue } from "./GuideForm";
import { RubricGrid, rubricTotals, type RubricValue } from "./RubricGrid";
import { feedbackComments } from "./SubmissionView";
import {
  WORKFLOW_STATES,
  fieldClass,
  formatNumber,
  htmlToText,
  parseGrade,
  textToHtml,
} from "./lib";

type CommentTarget = "feedback" | number;

/**
 * Grade + feedback for one participant. Mount with `key={userid}` so the
 * initial values are re-read when the teacher switches student.
 */
export function GradeForm({
  assignment,
  meta,
  userid,
  status,
  team,
  hasNext,
  onDirty,
  onSaved,
}: {
  assignment: Assignment;
  meta: GradingMeta;
  userid: number;
  status: SubmissionStatus;
  team: boolean;
  hasNext: boolean;
  onDirty: (dirty: boolean) => void;
  onSaved: (next: boolean) => Promise<void> | void;
}) {
  const t = useT();
  const { message } = App.useApp();
  const current = parseGrade(status.feedback?.grade?.grade);
  const maxgrade = meta.maxgrade ?? (assignment.grade > 0 ? assignment.grade : null);
  const isScale = assignment.grade < 0;
  const rubric = meta.method === "rubric" ? meta.rubric : undefined;
  const guide = meta.method === "guide" ? meta.guide : undefined;
  // Rubric / guide without its definition (no MOODLE_GRADING_TOKEN) cannot be graded here.
  const advancedBlocked = meta.method !== "simple" && !rubric && !guide;
  const scaleBlocked = meta.method === "simple" && isScale && !meta.scale?.length;

  const [points, setPoints] = useState(() =>
    current !== null && !isScale ? formatNumber(current) : ""
  );
  const [scaleIdx, setScaleIdx] = useState<number>(() =>
    current !== null && isScale ? Math.round(current) : -1
  );
  const [rubricValue, setRubricValue] = useState<RubricValue>(() =>
    Object.fromEntries(
      (meta.fillings ?? []).map((f) => [f.criterionid, { levelid: f.levelid, remark: f.remark ?? "" }])
    )
  );
  const [guideValue, setGuideValue] = useState<GuideValue>(() =>
    Object.fromEntries(
      (meta.fillings ?? []).map((f) => [
        f.criterionid,
        { score: f.score !== undefined ? formatNumber(f.score) : "", remark: f.remark ?? "" },
      ])
    )
  );
  const [feedback, setFeedback] = useState(() =>
    htmlToText(feedbackComments(status.feedback?.plugins))
  );
  const [workflow, setWorkflow] = useState(() => {
    const s = status.lastattempt?.gradingstatus ?? "";
    return (WORKFLOW_STATES as readonly string[]).includes(s) ? s : "notmarked";
  });
  const [commentTarget, setCommentTarget] = useState<CommentTarget>("feedback");
  const [saving, setSaving] = useState<false | "save" | "next">(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  // Wrap setters so any edit marks the form dirty.
  const edit =
    <V,>(setter: (v: V) => void) =>
    (v: V) => {
      setter(v);
      setError(null);
      onDirty(true);
    };

  const appendComment = (text: string) => {
    if (commentTarget === "feedback") {
      edit(setFeedback)(feedback ? `${feedback}\n${text}` : text);
    } else {
      const cur = guideValue[commentTarget] ?? { score: "", remark: "" };
      edit(setGuideValue)({
        ...guideValue,
        [commentTarget]: { ...cur, remark: cur.remark ? `${cur.remark}\n${text}` : text },
      });
    }
  };

  /** Validates and builds the mod_assign_save_grade args, or returns an error key. */
  const buildPayload = (): { args?: Record<string, unknown>; error?: string } => {
    let grade = -1;
    let advancedgradingdata: Record<string, unknown> | undefined;

    if (rubric) {
      if (rubric.criteria.some((c) => !rubricValue[c.id]?.levelid)) return { error: "grading.errors.rubricIncomplete" };
      grade = 0;
      advancedgradingdata = {
        rubric: {
          criteria: rubric.criteria.map((c) => ({
            criterionid: c.id,
            fillings: [
              {
                criterionid: c.id,
                levelid: rubricValue[c.id].levelid,
                remark: rubricValue[c.id].remark ?? "",
                remarkformat: 1,
              },
            ],
          })),
        },
      };
    } else if (guide) {
      if (guide.criteria.some((c) => guideScore(c, guideValue) === null)) return { error: "grading.errors.guideInvalid" };
      grade = 0;
      advancedgradingdata = {
        guide: {
          criteria: guide.criteria.map((c) => ({
            criterionid: c.id,
            fillings: [
              {
                criterionid: c.id,
                score: guideScore(c, guideValue),
                remark: guideValue[c.id]?.remark ?? "",
                remarkformat: 1,
              },
            ],
          })),
        },
      };
    } else if (isScale) {
      // Without scale items keep whatever grade is stored; only feedback changes.
      grade = scaleBlocked ? (current ?? -1) : scaleIdx;
    } else if (points.trim() !== "") {
      const n = Number(points);
      if (!Number.isFinite(n) || n < 0 || (maxgrade !== null && n > maxgrade)) {
        return { error: "grading.errors.pointsRange" };
      }
      grade = n;
    }

    return {
      args: {
        assignmentid: assignment.id,
        userid,
        grade,
        attemptnumber: -1,
        addattempt: false,
        workflowstate: assignment.markingworkflow ? workflow : "",
        applytoall: team,
        plugindata: {
          assignfeedbackcomments_editor: { text: textToHtml(feedback), format: 1 },
        },
        ...(advancedgradingdata && { advancedgradingdata }),
      },
    };
  };

  const save = async (next: boolean) => {
    const { args, error: invalid } = buildPayload();
    if (!args) {
      setShowErrors(true);
      setError(t(invalid!, { max: maxgrade ?? "" }));
      return;
    }
    setSaving(next ? "next" : "save");
    setError(null);
    try {
      await moodleClient("mod_assign_save_grade", args);
      onDirty(false);
      setShowErrors(false);
      message.success(t("grading.saved"));
      await onSaved(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const rubricSum = rubric ? rubricTotals(rubric.criteria, rubricValue) : null;
  const guideSum = guide
    ? {
        total: guide.criteria.reduce((s, c) => s + (guideScore(c, guideValue) ?? 0), 0),
        max: guide.criteria.reduce((s, c) => s + c.maxscore, 0),
      }
    : null;
  const estimate = (() => {
    if (!maxgrade) return null;
    if (rubricSum && rubricSum.max > rubricSum.min) {
      return ((rubricSum.total - rubricSum.min) / (rubricSum.max - rubricSum.min)) * maxgrade;
    }
    if (guideSum && guideSum.max > 0) return (guideSum.total / guideSum.max) * maxgrade;
    return null;
  })();

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
      <div className="space-y-5 p-5">
        {(advancedBlocked || scaleBlocked || !meta.complete) && (
          <div className="flex gap-3 rounded-lg border border-warning/40 bg-warning-soft p-3 text-[13px] text-fg">
            <TriangleAlert size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-warning" />
            <p>
              {advancedBlocked
                ? t(meta.notDefined ? "grading.advancedNotDefined" : "grading.incompleteAdvanced")
                : scaleBlocked
                  ? t("grading.incompleteScale")
                  : t("grading.incompleteGeneric")}
            </p>
          </div>
        )}

        {rubric && (
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-fg">{rubric.name || t("grading.method.rubric")}</h3>
              {rubricSum && (
                <span className="text-xs tabular-nums text-muted">
                  {t("grading.rubricTotal", {
                    total: formatNumber(rubricSum.total),
                    max: formatNumber(rubricSum.max),
                  })}
                </span>
              )}
            </div>
            <RubricGrid
              criteria={rubric.criteria}
              value={rubricValue}
              onChange={edit(setRubricValue)}
              disabled={!!saving}
              showErrors={showErrors}
            />
          </section>
        )}

        {guide && (
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-fg">{guide.name || t("grading.method.guide")}</h3>
              {guideSum && (
                <span className="text-xs tabular-nums text-muted">
                  {t("grading.rubricTotal", {
                    total: formatNumber(guideSum.total),
                    max: formatNumber(guideSum.max),
                  })}
                </span>
              )}
            </div>
            <GuideForm
              criteria={guide.criteria}
              value={guideValue}
              onChange={edit(setGuideValue)}
              onFocusRemark={setCommentTarget}
              disabled={!!saving}
              showErrors={showErrors}
            />
          </section>
        )}

        {estimate !== null && maxgrade !== null && (
          <p className="rounded-lg bg-surface-2 px-3 py-2 text-[13px] text-muted">
            {t("grading.estimatedGrade", {
              grade: formatNumber(estimate),
              max: formatNumber(maxgrade),
            })}
          </p>
        )}

        {meta.method === "simple" && !isScale && (
          <div>
            <Label htmlFor="grade-points">
              {t("grading.gradeOutOf", { max: maxgrade !== null ? formatNumber(maxgrade) : "—" })}
            </Label>
            <input
              id="grade-points"
              type="number"
              inputMode="decimal"
              min={0}
              max={maxgrade ?? undefined}
              step={0.01}
              value={points}
              onChange={(e) => edit(setPoints)(e.target.value)}
              disabled={!!saving}
              className={cn(fieldClass, "h-10 w-40 text-sm tabular-nums")}
            />
          </div>
        )}

        {meta.method === "simple" && isScale && !scaleBlocked && (
          <div>
            <Label>{t("grading.scaleLabel")}</Label>
            <Select<number>
              className="w-full"
              value={scaleIdx}
              onChange={edit(setScaleIdx)}
              disabled={!!saving}
              options={[
                { value: -1, label: t("grading.noGrade") },
                ...(meta.scale ?? []).map((label, i) => ({ value: i + 1, label })),
              ]}
            />
          </div>
        )}

        {assignment.markingworkflow ? (
          <div>
            <Label>{t("grading.workflowState")}</Label>
            <Select<string>
              className="w-full"
              value={workflow}
              onChange={edit(setWorkflow)}
              disabled={!!saving}
              options={WORKFLOW_STATES.map((s) => ({ value: s, label: t(`grading.workflow.${s}`) }))}
            />
          </div>
        ) : null}

        <div>
          <Label htmlFor="grade-feedback">{t("grading.feedback")}</Label>
          <textarea
            id="grade-feedback"
            rows={5}
            value={feedback}
            onChange={(e) => edit(setFeedback)(e.target.value)}
            onFocus={() => setCommentTarget("feedback")}
            disabled={!!saving}
            placeholder={t("grading.feedbackPlaceholder")}
            className={cn(fieldClass, "w-full resize-y py-2 text-sm")}
          />
          {guide && guide.comments.length > 0 && (
            <div className="mt-2">
              <p className="mb-1.5 text-xs text-subtle">
                {t("grading.frequentComments")} ·{" "}
                {commentTarget === "feedback"
                  ? t("grading.insertIntoFeedback")
                  : t("grading.insertIntoRemark", {
                      name: guide.criteria.find((c) => c.id === commentTarget)?.shortname ?? "",
                    })}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {guide.comments.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    // Keep focus (and so the insert target) where it was.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => appendComment(c)}
                    className="max-w-full truncate rounded-md border border-line bg-surface-2 px-2 py-1 text-xs text-muted transition-colors hover:border-line-strong hover:text-fg"
                    title={c}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div role="alert" className="flex gap-2 rounded-lg bg-error-soft p-3 text-[13px] text-error">
            <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save(false)} disabled={!!saving || advancedBlocked}>
            {saving === "save" ? (
              <LoaderCircle size={16} strokeWidth={1.75} className="animate-spin" />
            ) : (
              <Save size={16} strokeWidth={1.75} />
            )}
            {t("grading.save")}
          </Button>
          {hasNext && (
            <Button
              variant="secondary"
              onClick={() => save(true)}
              disabled={!!saving || advancedBlocked}
            >
              {saving === "next" ? (
                <LoaderCircle size={16} strokeWidth={1.75} className="animate-spin" />
              ) : (
                <SkipForward size={16} strokeWidth={1.75} />
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
