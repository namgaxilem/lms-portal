"use client";
import { useEffect, useRef, useState } from "react";
import { App } from "antd";
import { FilePen, LoaderCircle, Paperclip, RotateCcw, Save, Send, TriangleAlert, CloudUpload, X } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Badge, Button, Card, CardHeader, IconTile, QueryState, cn } from "@/components/ui";
import { moodleClient, uploadDraftFiles } from "@/lib/client-api";
import { formatFileSize } from "@/lib/moodle/files";
import { useKeyedAsync } from "@/lib/moodle/hooks";
import type { AssignSubmission, Assignment, MoodleFile, MoodleWarning, SubmissionStatus } from "@/lib/moodle/types";
import { FileRow } from "@/components/FileList";
import { ErrorList, StatementCheckbox } from "./FormParts";
import {
  FileRefetchError,
  countWords,
  currentSubmission,
  emptyDraftItemid,
  fetchAsFile,
  fileAllowed,
  hasEmbeddedMedia,
  htmlToText,
  isRichHtml,
  onlineText,
  statementText,
  submissionFiles,
  textToHtml,
  toPluginfilePlaceholders,
  warningMessages,
  type SubmissionSettings,
} from "./lib";

type EditFile =
  | { key: string; kind: "existing"; file: MoodleFile }
  | { key: string; kind: "new"; file: File };

const fileName = (f: EditFile) => (f.kind === "new" ? f.file.name : f.file.filename);

const textareaClass =
  "min-h-56 w-full resize-y rounded-2xl border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-fg outline-none transition-[border-color,box-shadow] placeholder:text-subtle hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:opacity-60 aria-invalid:border-error aria-invalid:focus:border-error aria-invalid:focus:ring-error/20";

interface EditorProps {
  assignment: Assignment;
  settings: SubmissionSettings;
  onSaved: () => void;
  onCancel: () => void;
}

/**
 * Edit form for the current user's submission (online text + files). It opens
 * on its own unfiltered read of the submission: the page's copy is filtered
 * for display (one language of a multilang text, autolinks, emoticon images),
 * and an unchanged text is saved back exactly as read.
 */
export function SubmissionEditor(props: EditorProps) {
  const { assignment, onCancel } = props;
  const t = useT();
  const stored = useKeyedAsync(`assign-edit:${assignment.id}`, () =>
    moodleClient<SubmissionStatus>("mod_assign_get_submission_status", { assignid: assignment.id }, { filter: false })
  );
  if (stored.data) return <EditorForm {...props} submission={currentSubmission(stored.data, assignment)} />;
  return (
    <Card className="space-y-4 p-5">
      <QueryState loading={stored.loading} error={stored.error} onRetry={stored.reload}>
        {null}
      </QueryState>
      {stored.error && (
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onCancel}>
            <RotateCcw size={16} strokeWidth={1.85} />
            {t("assignment.editor.cancel")}
          </Button>
        </div>
      )}
    </Card>
  );
}

/**
 * Save sequence: upload the file set into one draft area when it changed (or
 * when the text is empty, since Moodle rejects a save whose data looks empty),
 * then mod_assign_save_submission.
 */
function EditorForm({
  assignment,
  settings,
  submission,
  onSaved,
  onCancel,
}: EditorProps & { submission?: AssignSubmission }) {
  const t = useT();
  const { locale } = useLocale();
  const { message } = App.useApp();
  const maxSize = formatFileSize(settings.maxBytes, locale);

  const original = onlineText(submission?.plugins);
  const [initialText] = useState(() => (original ? htmlToText(original.text) : ""));
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
  const textRef = useRef<HTMLTextAreaElement>(null);
  const headingRef = useRef<HTMLSpanElement>(null);

  // The button that opened the editor is gone: start in the text box (or on the title).
  useEffect(() => {
    (textRef.current ?? headingRef.current)?.focus();
  }, []);

  const words = countWords(text);
  const overWords = settings.wordLimit > 0 && words > settings.wordLimit;
  // Without drafts, saving submits: Moodle asks for the statement in this form.
  const statement = assignment.submissiondrafts ? null : statementText(assignment);

  const textChanged = text !== initialText;
  const keepsOriginal = !!original && !textChanged;
  const filesChanged =
    files.some((f) => f.kind === "new") || files.length !== originalFiles.length;
  // Mirrors Moodle's onlinetext submission_is_empty(): words, or embedded media.
  const sendsText =
    settings.onlinetext && (words > 0 || (keepsOriginal && hasEmbeddedMedia(original.text)));
  const empty = !sendsText && !(settings.file && files.length > 0);
  const disabled = busy !== null;

  const addFiles = (list: FileList | File[]) => {
    const problems: string[] = [];
    const next = [...files];
    for (const f of Array.from(list)) {
      if (!fileAllowed(f.name, settings)) {
        problems.push(
          t("assignment.editor.badType", { name: f.name, types: (settings.extensions ?? []).join(", ") })
        );
        continue;
      }
      if (maxSize && f.size > settings.maxBytes) {
        problems.push(t("assignment.editor.tooLarge", { name: f.name, max: maxSize }));
        continue;
      }
      // Names are unique in the list (a file with the same name replaces the
      // earlier entry: Moodle keeps one file per name), so they key the rows.
      const entry: EditFile = { key: `n:${f.name}:${f.size}:${f.lastModified}`, kind: "new", file: f };
      const dup = next.findIndex((e) => fileName(e) === f.name);
      if (dup >= 0) {
        next[dup] = entry;
      } else if (next.length >= settings.maxFiles) {
        problems.push(t("assignment.editor.tooManyFiles", { max: settings.maxFiles }));
        break;
      } else {
        next.push(entry);
      }
    }
    setFiles(next);
    setErrors(problems);
  };

  const removeFile = (key: string) => setFiles((fs) => fs.filter((f) => f.key !== key));

  /** Draft itemid holding the whole file set (kept files are downloaded and re-uploaded). */
  const uploadFileSet = async () => {
    let itemid = 0;
    for (let i = 0; i < files.length; i++) {
      const entry = files[i];
      setBusy(t("assignment.editor.uploading", { n: i + 1, total: files.length }));
      const file = entry.kind === "new" ? entry.file : await fetchAsFile(entry.file);
      itemid = await uploadDraftFiles([file], itemid);
    }
    return itemid;
  };

  const save = async () => {
    setErrors([]);
    if (empty) {
      setErrors([t("assignment.editor.empty")]);
      return;
    }
    if (statement && !accepted) {
      setErrors([t("assignment.statement.required")]);
      return;
    }

    const plugindata: Record<string, unknown> = {};
    try {
      if (settings.onlinetext) {
        plugindata.onlinetext_editor = keepsOriginal
          ? // Unchanged: store the same HTML with itemid 0, which leaves its embedded files alone.
            { text: toPluginfilePlaceholders(original.text, submission?.id ?? 0), format: original.format, itemid: 0 }
          : // Edited as plain text: an empty draft also clears the old embedded files.
            { text: textToHtml(text), format: 1, itemid: emptyDraftItemid() };
      }
      if (settings.file) {
        if (filesChanged || !sendsText) {
          // An empty draft area clears every submitted file.
          plugindata.files_filemanager = files.length ? await uploadFileSet() : emptyDraftItemid();
        } else {
          // 0 = leave the submitted files untouched (file_postupdate_standard_filemanager skips empty ids).
          plugindata.files_filemanager = 0;
        }
      }

      setBusy(t("assignment.editor.saving"));
      const warnings = await moodleClient<MoodleWarning[]>("mod_assign_save_submission", {
        assignmentid: assignment.id,
        plugindata,
      });
      const msgs = warningMessages(warnings, t, t("assignment.editor.saveFailed"));
      if (msgs.length) {
        setErrors(msgs);
        return;
      }
      message.success(t("assignment.editor.saved"));
      onSaved();
    } catch (e) {
      setErrors([
        e instanceof FileRefetchError
          ? t("assignment.editor.refetchFailed", { name: e.filename })
          : (e as Error).message || t("assignment.editor.saveFailed"),
      ]);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="animate-fade-in-up">
      <CardHeader
        title={
          <span ref={headingRef} tabIndex={-1} className="flex items-center gap-3 rounded-lg">
            <IconTile icon={FilePen} tone="primary" size="sm" />
            {submission && submission.status !== "new" ? t("assignment.editTitle") : t("assignment.addTitle")}
          </span>
        }
        description={assignment.submissiondrafts ? t("assignment.editor.hint") : t("assignment.editor.hintNoDrafts")}
      />
      <div className="space-y-6 p-5">
        {settings.onlinetext && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="assign-onlinetext" className="text-sm font-bold text-fg">
                {t("assignment.onlineText")}
              </label>
              <span className={cn("text-xs font-semibold tabular-nums", overWords ? "text-error-text" : "text-subtle")}>
                {settings.wordLimit > 0
                  ? t("assignment.editor.wordsOfLimit", { n: words, limit: settings.wordLimit })
                  : t("assignment.editor.words", { n: words })}
              </span>
            </div>
            {original && isRichHtml(original.text) && !textChanged && (
              <div className="mb-2 flex items-start gap-2 rounded-2xl bg-warning-soft px-4 py-2.5 text-[13px] text-warning-text">
                <TriangleAlert size={16} strokeWidth={1.85} className="mt-0.5 shrink-0" />
                <span>{t("assignment.editor.richNotice")}</span>
              </div>
            )}
            <textarea
              ref={textRef}
              id="assign-onlinetext"
              className={textareaClass}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("assignment.editor.textPlaceholder")}
              aria-invalid={overWords || undefined}
              disabled={disabled}
            />
            {overWords && (
              <p className="mt-1.5 text-xs font-medium text-error-text">
                {t("assignment.editor.overWords", { limit: settings.wordLimit })}
              </p>
            )}
          </div>
        )}

        {settings.file && (
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="text-sm font-bold text-fg">{t("assignment.files")}</span>
              <span className="text-xs tabular-nums text-subtle">
                {t("assignment.editor.fileLimits", { n: files.length, max: settings.maxFiles })}
                {maxSize && ` · ${t("assignment.editor.maxSize", { size: maxSize })}`}
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
                "flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors",
                dragging ? "border-primary bg-primary-soft" : "border-line-strong bg-surface-2"
              )}
            >
              <IconTile icon={CloudUpload} tone="primary" />
              <p className="text-sm text-muted">{t("assignment.editor.dropHint")}</p>
              {/* Stays enabled at the file limit: a same-name file still replaces its entry (addFiles enforces the limit). */}
              <Button variant="secondary" disabled={disabled} onClick={() => inputRef.current?.click()}>
                <Paperclip size={16} strokeWidth={1.85} />
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
              <ul className="mt-3 space-y-2">
                {files.map((f) => (
                  <FileRow
                    key={f.key}
                    name={fileName(f)}
                    size={f.kind === "new" ? f.file.size : f.file.filesize}
                    mimetype={f.kind === "new" ? f.file.type : f.file.mimetype}
                  >
                    {f.kind === "new" && <Badge tone="primary">{t("assignment.editor.newFile")}</Badge>}
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      onClick={() => removeFile(f.key)}
                      aria-label={t("common.removeFile", { name: fileName(f) })}
                      title={t("common.removeFile", { name: fileName(f) })}
                    >
                      <X size={16} strokeWidth={1.85} />
                    </Button>
                  </FileRow>
                ))}
              </ul>
            )}
          </div>
        )}

        {statement && (
          <StatementCheckbox statement={statement} checked={accepted} onChange={setAccepted} disabled={disabled} />
        )}

        <ErrorList errors={errors} />

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
          {busy && (
            <span role="status" className="mr-auto inline-flex items-center gap-2 text-[13px] text-muted">
              <LoaderCircle size={16} strokeWidth={1.85} className="animate-spin" />
              {busy}
            </span>
          )}
          <Button variant="ghost" onClick={onCancel} disabled={disabled}>
            <RotateCcw size={16} strokeWidth={1.85} />
            {t("assignment.editor.cancel")}
          </Button>
          <Button variant="gradient" onClick={save} disabled={disabled || overWords}>
            {disabled ? (
              <LoaderCircle size={16} strokeWidth={1.85} className="animate-spin" />
            ) : assignment.submissiondrafts ? (
              <Save size={16} strokeWidth={1.85} />
            ) : (
              <Send size={16} strokeWidth={1.85} />
            )}
            {assignment.submissiondrafts ? t("assignment.editor.saveDraft") : t("assignment.editor.saveSubmit")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
