"use client";
import { useId } from "react";
import { Check, CircleAlert } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { cn } from "@/components/ui";
import type { RubricCriterion } from "@/lib/moodle/types";
import { formatNumber } from "@/lib/format";
import { textareaClass, type RubricValue } from "./lib";

/** Criteria × levels as native radio groups, plus an optional remark per criterion. */
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
  /** Mark criteria without a level (after a failed save attempt). */
  showErrors?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const base = useId();
  const set = (id: number, patch: Partial<RubricValue[number]>) =>
    onChange((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { remark: "" }), ...patch } }));

  return (
    <div className="space-y-3">
      {criteria.map((c) => {
        const missing = showErrors && !value[c.id]?.levelid;
        const errorId = `${base}-missing-${c.id}`;
        return (
          <fieldset
            key={c.id}
            disabled={disabled}
            data-invalid={missing || undefined}
            className={cn(
              "space-y-2.5 rounded-control border p-3",
              missing ? "border-error/50 bg-error-soft/40" : "border-line"
            )}
          >
            <legend className={cn("px-1 text-sm font-bold whitespace-pre-line", missing ? "text-error-text" : "text-fg")}>
              {c.description}
            </legend>
            {missing && (
              <p id={errorId} className="flex items-center gap-1.5 text-xs font-semibold text-error-text">
                <CircleAlert size={14} strokeWidth={2} aria-hidden className="shrink-0" />
                {t("grading.errors.levelRequired")}
              </p>
            )}
            <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
              {c.levels.map((l) => {
                const selected = value[c.id]?.levelid === l.id;
                return (
                  <label
                    key={l.id}
                    className={cn(
                      "relative flex min-w-36 flex-1 snap-start cursor-pointer flex-col gap-1 rounded-control border p-2.5 transition has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ring has-[input:disabled]:cursor-default has-[input:disabled]:opacity-60",
                      selected
                        ? "border-primary bg-primary-soft ring-2 ring-primary/25"
                        : "border-line hover:border-line-strong hover:bg-surface-2"
                    )}
                  >
                    <input
                      type="radio"
                      name={`rubric-${c.id}`}
                      value={l.id}
                      checked={selected}
                      onChange={() => set(c.id, { levelid: l.id })}
                      aria-describedby={missing ? errorId : undefined}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        "flex items-center justify-between gap-2 text-xs font-bold tabular-nums",
                        selected ? "text-primary-text" : "text-muted"
                      )}
                    >
                      {t("grading.points", { n: formatNumber(l.score, locale) })}
                      {selected && <Check size={14} strokeWidth={2.5} aria-hidden />}
                    </span>
                    <span className="text-xs leading-snug whitespace-pre-line text-fg">{l.definition}</span>
                  </label>
                );
              })}
            </div>
            <textarea
              rows={1}
              value={value[c.id]?.remark ?? ""}
              onChange={(e) => set(c.id, { remark: e.target.value })}
              placeholder={t("grading.remarkPlaceholder")}
              aria-label={`${t("grading.remarkPlaceholder")}: ${c.description}`}
              className={textareaClass}
            />
          </fieldset>
        );
      })}
    </div>
  );
}
