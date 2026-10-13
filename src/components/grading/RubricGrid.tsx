"use client";
import { useT } from "@/i18n/I18nProvider";
import { cn } from "@/components/ui";
import type { RubricCriterion } from "@/lib/moodle/types";
import { fieldClass, formatNumber } from "./lib";

export type RubricValue = Record<number, { levelid?: number; remark: string }>;

/** Raw rubric score plus the min/max reachable, used to estimate the grade. */
export function rubricTotals(criteria: RubricCriterion[], value: RubricValue) {
  let total = 0;
  let min = 0;
  let max = 0;
  for (const c of criteria) {
    const scores = c.levels.map((l) => l.score);
    if (scores.length === 0) continue;
    min += Math.min(...scores);
    max += Math.max(...scores);
    const level = c.levels.find((l) => l.id === value[c.id]?.levelid);
    if (level) total += level.score;
  }
  return { total, min, max };
}

/** Criteria × levels; click a level to select it. Optional remark per criterion. */
export function RubricGrid({
  criteria,
  value,
  onChange,
  disabled,
  showErrors,
}: {
  criteria: RubricCriterion[];
  value: RubricValue;
  /** Receives an updater so rapid consecutive picks never overwrite each other. */
  onChange: (update: (prev: RubricValue) => RubricValue) => void;
  disabled?: boolean;
  /** Highlight criteria without a level (after a failed save attempt). */
  showErrors?: boolean;
}) {
  const t = useT();
  const set = (id: number, patch: Partial<RubricValue[number]>) =>
    onChange((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { remark: "" }), ...patch } }));

  return (
    <div className="space-y-4">
      {criteria.map((c) => {
        const missing = showErrors && !value[c.id]?.levelid;
        return (
          <fieldset key={c.id} disabled={disabled} className="space-y-2">
            <legend className={cn("text-sm font-medium", missing ? "text-error" : "text-fg")}>
              {c.description}
            </legend>
            <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup">
              {c.levels.map((l) => {
                const selected = value[c.id]?.levelid === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => set(c.id, { levelid: l.id })}
                    className={cn(
                      "flex min-w-32 flex-1 flex-col gap-1 rounded-lg border p-2.5 text-left transition-colors disabled:opacity-60",
                      selected
                        ? "border-primary bg-primary-soft ring-1 ring-primary"
                        : missing
                          ? "border-error/40 hover:bg-surface-2"
                          : "border-line hover:border-line-strong hover:bg-surface-2"
                    )}
                  >
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums",
                        selected ? "text-primary-text" : "text-muted"
                      )}
                    >
                      {t("grading.points", { n: formatNumber(l.score) })}
                    </span>
                    <span className="text-xs leading-snug text-fg">{l.definition}</span>
                  </button>
                );
              })}
            </div>
            <input
              value={value[c.id]?.remark ?? ""}
              onChange={(e) => set(c.id, { remark: e.target.value })}
              placeholder={t("grading.remarkPlaceholder")}
              className={cn(fieldClass, "h-8 w-full text-[13px]")}
            />
          </fieldset>
        );
      })}
    </div>
  );
}
