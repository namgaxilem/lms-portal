"use client";
import { useRef } from "react";
import { Paperclip, X } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui";
import { formatFileSize } from "@/lib/moodle/files";
import { emptyDraftItemid, fetchAsFile } from "@/components/assignment/lib";
import { uploadDraftFiles } from "@/lib/client-api";
import type { MoodleFile } from "@/lib/moodle/types";
import { FileList } from "@/components/FileList";

/** Edited feedback files; null = unchanged (the file area is left alone on save). */
export interface FeedbackFilesDraft {
  kept: MoodleFile[];
  added: File[];
}

/**
 * Draft area for assignfeedback_file. Moodle replaces the whole file area with
 * the draft, so kept files are copied into it and new ones uploaded; an empty
 * draft clears the area.
 */
export async function uploadFeedbackFiles(draft: FeedbackFilesDraft): Promise<number> {
  if (draft.kept.length + draft.added.length === 0) return emptyDraftItemid();
  let itemid = 0;
  for (const f of draft.kept) itemid = await uploadDraftFiles([await fetchAsFile(f)], itemid);
  for (const f of draft.added) itemid = await uploadDraftFiles([f], itemid);
  return itemid;
}

/** Editable feedback files (assignfeedback_file): current ones (preview, download, remove) plus newly attached ones. */
export function FeedbackFiles({
  current,
  draft,
  onChange,
  disabled,
}: {
  current: MoodleFile[];
  draft: FeedbackFilesDraft | null;
  onChange: (draft: FeedbackFilesDraft) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const input = useRef<HTMLInputElement>(null);
  const kept = draft?.kept ?? current;
  const added = draft?.added ?? [];

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium text-fg">{t("grading.feedbackFiles")}</p>
      {kept.length > 0 && (
        <FileList
          files={kept}
          disabled={disabled}
          onRemove={(f) => onChange({ kept: kept.filter((k) => k !== f), added })}
        />
      )}
      {added.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={t("grading.attachFiles")}>
          {added.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary-soft py-0.5 pl-2.5 pr-1 text-xs font-semibold text-primary-text"
            >
              <span className="truncate">
                {f.name}
                {f.size > 0 && (
                  <span className="font-normal tabular-nums opacity-80"> · {formatFileSize(f.size, locale)}</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => onChange({ kept, added: added.filter((a) => a !== f) })}
                disabled={disabled}
                aria-label={t("common.removeFile", { name: f.name })}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full transition hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 dark:hover:bg-white/10"
              >
                <X size={12} strokeWidth={2.25} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) onChange({ kept, added: [...added, ...files] });
        }}
      />
      <Button variant="secondary" size="sm" disabled={disabled} onClick={() => input.current?.click()}>
        <Paperclip size={15} strokeWidth={1.85} />
        {t("grading.attachFiles")}
      </Button>
    </div>
  );
}
