"use client";
import { useT } from "@/i18n/I18nProvider";
import { cn } from "@/components/ui";
import type { GuideCriterion } from "@/lib/moodle/types";
import { fieldClass } from "./lib";

export type GuideValue = Record<number, { score: string; remark: string }>;

/** Number entered for a criterion, or null when empty / out of range. */
export function guideScore(c: GuideCriterion, value: GuideValue): number | null {
  const raw = value[c.id]?.score ?? "";
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= c.maxscore ? n : null;
}

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
  /** Tells the parent which remark frequently-used comments should go to. */
  onFocusRemark: (criterionid: number) => void;
  disabled?: boolean;
  showErrors?: boolean;
}) {
  const t = useT();
  const set = (id: number, patch: Partial<GuideValue[number]>) =>
    onChange((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { score: "", remark: "" }), ...patch } }));

  return (
    <div className="space-y-4">
      {criteria.map((c) => {
        const invalid = showErrors && guideScore(c, value) === null;
        return (
          <fieldset key={c.id} disabled={disabled} className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <legend className="text-sm font-medium text-fg">{c.shortname}</legend>
                {c.description && <p className="mt-0.5 text-xs text-muted">{c.description}</p>}
                {c.descriptionmarkers && (
                  <p className="mt-0.5 text-xs italic text-subtle">{c.descriptionmarkers}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={c.maxscore}
                  step={0.01}
                  value={value[c.id]?.score ?? ""}
                  onChange={(e) => set(c.id, { score: e.target.value })}
                  aria-label={c.shortname}
                  aria-invalid={invalid || undefined}
                  className={cn(fieldClass, "h-8 w-20 text-right text-sm tabular-nums aria-invalid:border-error")}
                />
                <span className="text-xs tabular-nums text-subtle">/ {c.maxscore}</span>
              </div>
            </div>
            <textarea
              rows={2}
              value={value[c.id]?.remark ?? ""}
              onChange={(e) => set(c.id, { remark: e.target.value })}
              onFocus={() => onFocusRemark(c.id)}
              placeholder={t("grading.remarkPlaceholder")}
              className={cn(fieldClass, "w-full py-2 text-[13px]")}
            />
          </fieldset>
        );
      })}
    </div>
  );
}
