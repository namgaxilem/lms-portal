"use client";
import { useRef, useState } from "react";
import { App } from "antd";
import {
  FileText,
  LoaderCircle,
  Paperclip,
  RotateCcw,
  Save,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Badge, Button, Card, CardHeader, RichText, cn } from "@/components/ui";
import { moodleClient, uploadDraftFiles } from "@/lib/client-api";
import type { AssignSubmission, Assignment, MoodleFile } from "@/lib/moodle/types";
import {
  countWords,
  emptyDraftItemid,
  fetchAsFile,
  fileAllowed,
  formatBytes,
  htmlToText,
  isRichHtml,
  onlineText,
  submissionFiles,
  textToHtml,
  warningMessages,
  type SubmissionSettings,
  type WsWarning,
} from "./lib";

type EditFile =
  | { key: string; kind: "existing"; file: MoodleFile }
  | { key: string; kind: "new"; file: File };

const textareaClass =
  "min-h-56 w-full resize-y rounded-lg border border-line bg-surface px-3 py-2.5 text-sm leading-relaxed text-fg outline-none transition-[border-color,box-shadow] placeholder:text-subtle hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-ring/30 disabled:opacity-60";

/**
 * Edit form for the current user's submission (online text + files).
 *
 * Save sequence: re-upload kept files + upload new files into one draft area
 * (only when the file set changed), then mod_assign_save_submission.
 */
export function SubmissionEditor({
  assignment,
  settings,
  submission,
  onSaved,
  onCancel,
}: {
  assignment: Assignment;
  settings: SubmissionSettings;
  submission?: AssignSubmission;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const { message } = App.useApp();

  const original = onlineText(submission?.plugins);
  const [initialText] = useState(() =>
    original ? (original.format === 1 ? htmlToText(original.text) : original.text) : ""
  );
  const richOriginal = !!original && original.format === 1 && isRichHtml(original.text);
  const originalFiles = submissionFiles(submission?.plugins);

  const [text, setText] = useState(initialText);
  const [files, setFiles] = useState<EditFile[]>(() =>
    originalFiles.map((f) => ({ key: `e:${f.fileurl}`, kind: "existing", file: f }))
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const words = countWords(text);
  const overWords = settings.wordLimit > 0 && words > settings.wordLimit;
  const needsStatement =
    !assignment.submissiondrafts && !!assignment.requiresubmissionstatement;

  const addFiles = (list: FileList | File[]) => {
    const incoming = Array.from(list);
    const problems: string[] = [];
    const next = [...files];
    for (const f of incoming) {
      if (next.length >= settings.maxFiles) {
        problems.push(t("assignment.editor.tooManyFiles", { max: settings.maxFiles }));
        break;
      }
      if (!fileAllowed(f.name, settings)) {
        problems.push(
          t("assignment.editor.badType", {
            name: f.name,
            types: (settings.extensions ?? []).join(", "),
          })
        );
        continue;
      }
      if (settings.maxBytes && f.size > settings.maxBytes) {
        problems.push(
          t("assignment.editor.tooLarge", { name: f.name, max: formatBytes(settings.maxBytes) })
        );
        continue;
      }
      // Same name replaces the earlier entry (Moodle keeps one file per name).
      const dup = next.findIndex(
        (e) => (e.kind === "new" ? e.file.name : e.file.filename) === f.name
      );
      const entry: EditFile = {
        key: `n:${f.name}:${f.size}:${f.lastModified}:${Math.random()}`,
        kind: "new",
        file: f,
      };
      if (dup >= 0) next[dup] = entry;
      else next.push(entry);
    }
    setFiles(next);
    setErrors(problems);
  };

  const removeFile = (key: string) => setFiles((fs) => fs.filter((f) => f.key !== key));

  const filesChanged =
    files.some((f) => f.kind === "new") || files.length !== originalFiles.length;
  const textChanged = text !== initialText;
  const hasText = settings.onlinetext && text.trim().length > 0;
  const empty = !hasText && !(settings.file && files.length > 0);

  const save = async () => {
    setErrors([]);
    if (empty) {
      setErrors([t("assignment.editor.empty")]);
      return;
    }
    if (overWords) {
      setErrors([t("assignment.editor.overWords", { limit: settings.wordLimit })]);
      return;
    }
    if (needsStatement && !accepted) {
      setErrors([t("assignment.statement.required")]);
      return;
    }

    const plugindata: Record<string, unknown> = {};
    try {
      if (settings.onlinetext) {
        // Untouched text is sent back verbatim so rich formatting survives a files-only edit.
        const html =
          !textChanged && original ? original.text : textToHtml(text);
        plugindata.onlinetext_editor = {
          text: html,
          format: !textChanged && original ? original.format : 1,
          itemid: emptyDraftItemid(),
        };
      }
      if (settings.file) {
        if (filesChanged || !hasText) {
          if (files.length === 0) {
            // An empty draft area clears every submitted file.
            plugindata.files_filemanager = emptyDraftItemid();
          } else {
            let itemid = 0;
            for (let i = 0; i < files.length; i++) {
              const entry = files[i];
              setBusy(t("assignment.editor.uploading", { n: i + 1, total: files.length }));
              const file = entry.kind === "new" ? entry.file : await fetchAsFile(entry.file);
              itemid = await uploadDraftFiles([file], itemid);
            }
            plugindata.files_filemanager = itemid;
          }
        } else {
          // 0 = leave the submitted files untouched (file_postupdate_standard_filemanager skips empty ids).
          plugindata.files_filemanager = 0;
        }
      }

      setBusy(t("assignment.editor.saving"));
      const warnings = await moodleClient<WsWarning[]>("mod_assign_save_submission", {
        assignmentid: assignment.id,
        plugindata,
      });
      const msgs = warningMessages(warnings);
      if (msgs.length) {
        setErrors(msgs);
        return;
      }
      message.success(t("assignment.editor.saved"));
      onSaved();
    } catch (e) {
      setErrors([(e as Error).message || t("assignment.editor.saveFailed")]);
    } finally {
      setBusy(null);
    }
  };

  const disabled = busy !== null;

  return (
    <Card>
      <CardHeader
        title={submission && submission.status !== "new" ? t("assignment.editTitle") : t("assignment.addTitle")}
        description={t("assignment.editor.hint")}
      />
      <div className="space-y-6 p-5">
        {settings.onlinetext && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="assign-onlinetext" className="text-sm font-medium text-fg">
                {t("assignment.onlineText")}
              </label>
              <span
                className={cn("text-xs tabular-nums", overWords ? "text-error" : "text-subtle")}
              >
                {settings.wordLimit > 0
                  ? t("assignment.editor.wordsOfLimit", { n: words, limit: settings.wordLimit })
                  : t("assignment.editor.words", { n: words })}
              </span>
            </div>
            {richOriginal && !textChanged && (
              <div className="mb-2 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-[13px] text-fg">
                <TriangleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-warning" />
                <span>{t("assignment.editor.richNotice")}</span>
              </div>
            )}
            <textarea
              id="assign-onlinetext"
              className={cn(textareaClass, overWords && "border-error focus:border-error")}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("assignment.editor.textPlaceholder")}
              disabled={disabled}
            />
          </div>
        )}

        {settings.file && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-fg">{t("assignment.files")}</span>
              <span className="text-xs text-subtle">
                {t("assignment.editor.fileLimits", {
                  n: files.length,
                  max: settings.maxFiles,
                })}
                {settings.maxBytes > 0 &&
                  ` · ${t("assignment.editor.maxSize", { size: formatBytes(settings.maxBytes) })}`}
              </span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!disabled) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (!disabled && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
                dragging ? "border-primary bg-primary-soft" : "border-line-strong bg-surface-2"
              )}
            >
              <Upload size={20} strokeWidth={1.75} className="text-subtle" />
              <p className="text-sm text-muted">{t("assignment.editor.dropHint")}</p>
              <Button
                variant="secondary"
                size="sm"
                disabled={disabled || files.length >= settings.maxFiles}
                onClick={() => inputRef.current?.click()}
              >
                <Paperclip size={16} strokeWidth={1.75} />
                {t("assignment.editor.chooseFiles")}
              </Button>
              {settings.extensions && (
                <p className="text-xs text-subtle">
                  {t("assignment.editor.allowedTypes", { types: settings.extensions.join(", ") })}
                </p>
              )}
              <input
                ref={inputRef}
                type="file"
                multiple
                hidden
                accept={settings.accept}
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {files.length > 0 && (
              <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
                {files.map((f) => {
                  const name = f.kind === "new" ? f.file.name : f.file.filename;
                  const size = f.kind === "new" ? f.file.size : f.file.filesize;
                  return (
                    <li key={f.key} className="flex items-center gap-3 px-3 py-2.5">
                      <FileText size={18} strokeWidth={1.75} className="shrink-0 text-subtle" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-fg" title={name}>
                          {name}
                        </p>
                        <p className="text-xs text-subtle">{formatBytes(size)}</p>
                      </div>
                      {f.kind === "new" && (
                        <Badge tone="primary">{t("assignment.editor.newFile")}</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={disabled}
                        onClick={() => removeFile(f.key)}
                        aria-label={t("assignment.editor.removeFile")}
                        title={t("assignment.editor.removeFile")}
                      >
                        <X size={16} strokeWidth={1.75} />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {needsStatement && (
          <label className="flex items-start gap-3 rounded-lg border border-line bg-surface-2 p-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 accent-primary"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              disabled={disabled}
            />
            {assignment.submissionstatement ? (
              <RichText html={assignment.submissionstatement} className="text-[13px]" />
            ) : (
              <span className="text-[13px] text-fg">{t("assignment.statement.default")}</span>
            )}
          </label>
        )}

        {errors.length > 0 && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-error/30 bg-error-soft px-3 py-2.5 text-[13px] text-error"
          >
            <TriangleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            <ul className="space-y-0.5">
              {errors.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
          {busy && (
            <span className="mr-auto inline-flex items-center gap-2 text-[13px] text-muted">
              <LoaderCircle size={16} strokeWidth={1.75} className="animate-spin" />
              {busy}
            </span>
          )}
          <Button variant="ghost" onClick={onCancel} disabled={disabled}>
            <RotateCcw size={16} strokeWidth={1.75} />
            {t("assignment.editor.cancel")}
          </Button>
          <Button onClick={save} disabled={disabled || overWords}>
            {disabled ? (
              <LoaderCircle size={16} strokeWidth={1.75} className="animate-spin" />
            ) : (
              <Save size={16} strokeWidth={1.75} />
            )}
            {assignment.submissiondrafts
              ? t("assignment.editor.saveDraft")
              : t("assignment.editor.saveSubmit")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
