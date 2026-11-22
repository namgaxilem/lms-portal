"use client";
import { useId } from "react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { cn, inputClass } from "@/components/ui";
import type { GuideCriterion } from "@/lib/moodle/types";
import { formatNumber } from "@/lib/format";
import { guideScore, textareaClass, type GuideValue } from "./lib";

/** Marking guide: score + remark per criterion. */
export function GuideForm({
  criteria,
  value,
  onChange,
  onFocusRemark,
  disabled,
  showErrors,
}: {
  criteria: GuideCriterion[];
  value: GuideValue;
  /** Receives an updater so rapid consecutive edits never overwrite each other. */
  onChange: (update: (prev: GuideValue) => GuideValue) => void;
  /** Tells the parent which remark the frequently used comments should go to. */
  onFocusRemark: (criterionid: number) => void;
  disabled?: boolean;
  showErrors?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const base = useId();
  const set = (id: number, patch: Partial<GuideValue[number]>) =>
    onChange((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { score: "", remark: "" }), ...patch } }));

  return (
    <div className="space-y-3">
      {criteria.map((c) => {
        const invalid = showErrors && guideScore(c, value) === null;
        const scoreId = `${base}-score-${c.id}`;
        return (
          <fieldset
            key={c.id}
            disabled={disabled}
            className={cn("space-y-2.5 rounded-control border p-3", invalid ? "border-error/50" : "border-line")}
          >
            <legend className="sr-only">{c.shortname}</legend>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <label htmlFor={scoreId} className="text-sm font-bold text-fg">
                  {c.shortname}
                </label>
                {c.description && <p className="mt-0.5 text-xs whitespace-pre-line text-muted">{c.description}</p>}
                {c.descriptionmarkers && (
                  <p className="mt-1 rounded-lg bg-surface-2 px-2 py-1 text-xs whitespace-pre-line text-subtle">
                    {c.descriptionmarkers}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <div className="w-20">
                  <input
                    id={scoreId}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={c.maxscore}
                    step={0.01}
                    value={value[c.id]?.score ?? ""}
                    onChange={(e) => set(c.id, { score: e.target.value })}
                    aria-invalid={invalid || undefined}
                    className={cn(inputClass, "text-right tabular-nums aria-invalid:border-error")}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums text-subtle">/ {formatNumber(c.maxscore, locale)}</span>
              </div>
            </div>
            <textarea
              rows={2}
              value={value[c.id]?.remark ?? ""}
              onChange={(e) => set(c.id, { remark: e.target.value })}
              onFocus={() => onFocusRemark(c.id)}
              placeholder={t("grading.remarkPlaceholder")}
              aria-label={`${t("grading.remarkPlaceholder")}: ${c.shortname}`}
              className={textareaClass}
            />
          </fieldset>
        );
      })}
    </div>
  );
}
