"use client";
import { useT } from "@/i18n/I18nProvider";

/** Marking-guide comment bank; clicking inserts into the focused remark or the feedback. */
export function FrequentComments({
  comments,
  target,
  disabled,
  onPick,
}: {
  comments: string[];
  /** Criterion short name of the focused remark, or null for the feedback. */
  target: string | null;
  disabled: boolean;
  onPick: (text: string) => void;
}) {
  const t = useT();
  return (
    <div>
      <p className="mb-1.5 text-xs text-subtle">
        {t("grading.frequentComments")} ·{" "}
        {target === null ? t("grading.insertIntoFeedback") : t("grading.insertIntoRemark", { name: target })}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {comments.map((c, i) => (
          <button
            key={i}
            type="button"
            disabled={disabled}
            // Keep focus (and so the insert target) where it was.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(c)}
            title={c}
            className="max-w-full truncate rounded-full border border-line bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted transition hover:border-line-strong hover:text-fg focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
