"use client";
import { PencilLine } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Button, Label, RichText } from "@/components/ui";
import { textareaClass } from "./lib";

/**
 * Feedback comments. Feedback written in Moodle with formatting (links, lists,
 * images…) is shown read-only until the teacher explicitly chooses to edit it
 * as plain text, so saving a grade never flattens it by accident.
 */
export function FeedbackField({
  id,
  originalHtml,
  rich,
  editing,
  onStartEditing,
  value,
  onChange,
  onFocus,
  disabled,
  describedBy,
}: {
  id: string;
  originalHtml: string;
  /** The saved feedback uses formatting that plain text would lose. */
  rich: boolean;
  /** Plain-text editor shown (always true unless `rich`). */
  editing: boolean;
  onStartEditing: () => void;
  value: string;
  onChange: (text: string) => void;
  onFocus: () => void;
  disabled?: boolean;
  /** Id of a notice about this field (e.g. earlier feedback hidden by marking workflow). */
  describedBy?: string;
}) {
  const t = useT();
  const describedByIds = [describedBy, rich && editing ? `${id}-warning` : undefined].filter(Boolean).join(" ") || undefined;

  if (!editing) {
    return (
      <div>
        <p className="mb-1.5 text-[13px] font-medium text-fg">{t("grading.feedback")}</p>
        <div className="max-h-72 overflow-y-auto rounded-control border border-line bg-surface-2 p-3">
          <RichText html={originalHtml} />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-subtle">{t("grading.richFeedback")}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={onStartEditing}
            disabled={disabled}
            aria-describedby={describedByIds}
          >
            <PencilLine size={15} strokeWidth={1.85} />
            {t("grading.editAsPlainText")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor={id}>{t("grading.feedback")}</Label>
      <textarea
        id={id}
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        disabled={disabled}
        placeholder={t("grading.feedbackPlaceholder")}
        aria-describedby={describedByIds}
        className={textareaClass}
      />
      {rich && (
        <p id={`${id}-warning`} className="mt-1.5 text-xs text-warning-text">
          {t("grading.plainTextWarning")}
        </p>
      )}
    </div>
  );
}
