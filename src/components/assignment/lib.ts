import type {
  AssignPlugin,
  AssignSubmission,
  Assignment,
  MoodleFile,
  MoodleWarning,
  SubmissionStatus,
} from "@/lib/moodle/types";
import { fileUrl } from "@/lib/moodle/files";
import { decodeEntities, formatDateTime, hasRichContent, stripHtml } from "@/lib/format";
import type { TFn } from "@/i18n/translate";

/* ---------------- Assignment settings ---------------- */

export interface SubmissionSettings {
  onlinetext: boolean;
  file: boolean;
  /** 0 = no word limit. */
  wordLimit: number;
  maxFiles: number;
  /** Per-file limit in bytes; 0 = site/course limit (enforced server-side). */
  maxBytes: number;
  /** Lower-cased extensions (".pdf") when the type list is plain extensions, else null. */
  extensions: string[] | null;
  /** Value for <input accept>, or undefined when unrestricted / not expressible. */
  accept?: string;
}

function config(a: Assignment, plugin: string, name: string, subtype = "assignsubmission") {
  return a.configs?.find((c) => c.subtype === subtype && c.plugin === plugin && c.name === name)
    ?.value;
}

export function submissionSettings(a: Assignment): SubmissionSettings {
  const onlinetext = config(a, "onlinetext", "enabled") === "1";
  const file = config(a, "file", "enabled") === "1";
  const wordLimit =
    config(a, "onlinetext", "wordlimitenabled") === "1"
      ? Number(config(a, "onlinetext", "wordlimit")) || 0
      : 0;
  const maxFiles = Number(config(a, "file", "maxfilesubmissions")) || 20;
  const maxBytes = Number(config(a, "file", "maxsubmissionsizebytes")) || 0;

  const raw = (config(a, "file", "filetypeslist") ?? "")
    .split(/[\s,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  // Only plain extensions / mime types are understood; groups ("document") are left to Moodle.
  const simple = raw.length > 0 && raw.every((s) => s.startsWith(".") || s.includes("/"));
  const extensions = simple ? raw.filter((s) => s.startsWith(".")) : null;
  return {
    onlinetext,
    file,
    wordLimit,
    maxFiles,
    maxBytes,
    extensions: extensions && extensions.length ? extensions : null,
    accept: simple ? raw.join(",") : undefined,
  };
}

/** True when the file matches the extension whitelist (or there is none). */
export function fileAllowed(name: string, s: SubmissionSettings) {
  if (!s.extensions) return true;
  const lower = name.toLowerCase();
  return s.extensions.some((ext) => lower.endsWith(ext));
}

/**
 * The submission statement students must accept, or null. Moodle drops the
 * requirement when the site statement for this submission type is empty
 * (get_assignments then sends "" or nothing).
 */
export function statementText(a: Assignment): string | null {
  return a.requiresubmissionstatement && hasRichContent(a.submissionstatement) ? a.submissionstatement : null;
}

/* ---------------- Submission data ---------------- */

export function currentSubmission(
  status: SubmissionStatus | null | undefined,
  a: Assignment
): AssignSubmission | undefined {
  const la = status?.lastattempt;
  return (a.teamsubmission ? la?.teamsubmission : la?.submission) ?? la?.submission;
}

function plugin(plugins: AssignPlugin[] | undefined, type: string) {
  return plugins?.find((p) => p.type === type);
}

/** Online text of a submission (always HTML: the WS formats every editor field). */
export function onlineText(plugins: AssignPlugin[] | undefined) {
  const field = plugin(plugins, "onlinetext")?.editorfields?.find((f) => f.name === "onlinetext");
  return field && field.text.trim() ? field : undefined;
}

/** Files of one plugin's file area (Moodle lists the area's "." directory entry too). */
function fileArea(plugins: AssignPlugin[] | undefined, type: string, area: string): MoodleFile[] {
  return plugin(plugins, type)?.fileareas?.find((a) => a.area === area)?.files?.filter((f) => f.filename !== ".") ?? [];
}

export function submissionFiles(plugins: AssignPlugin[] | undefined): MoodleFile[] {
  return fileArea(plugins, "file", "submission_files");
}

/** assignfeedback_file's feedback_files: the feedback file area teachers upload to. */
export function feedbackFileArea(plugins: AssignPlugin[] | undefined): MoodleFile[] {
  return fileArea(plugins, "file", "feedback_files");
}

/** The annotated PDF of assignfeedback_editpdf ("download"); its page images, stamps and tmp areas are internal. */
export function annotatedPdfs(plugins: AssignPlugin[] | undefined): MoodleFile[] {
  return fileArea(plugins, "editpdf", "download");
}

export function feedbackComments(plugins: AssignPlugin[] | undefined) {
  const field = plugin(plugins, "comments")?.editorfields?.find((f) => f.name === "comments");
  return field?.text.trim() ? field.text : undefined;
}

/** Feedback files a student sees: uploaded feedback files and the annotated PDF. */
export function feedbackFiles(plugins: AssignPlugin[] | undefined): MoodleFile[] {
  return [...feedbackFileArea(plugins), ...annotatedPdfs(plugins)];
}

/** Moodle raw grade string → number, or null when not graded ("" / "-1.00000"). */
export function rawGrade(grade: string | undefined | null) {
  if (grade === undefined || grade === null || grade === "") return null;
  const n = Number(grade);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Moodle's rendered grade (`gradefordisplay`), or null when it shows no grade.
 * It comes from the gradebook, so it also covers grades overridden there.
 */
export function gradeHtml(html: string | null | undefined) {
  if (!html) return null;
  const text = stripHtml(html);
  return text && text !== "-" ? html : null;
}

/** Short plain-text grade for compact places (null for rubric/guide markup). */
export function gradeLabel(html: string | null | undefined) {
  const grade = gradeHtml(html);
  if (!grade || /<table/i.test(grade)) return null;
  const text = stripHtml(grade).replace(/\s+/g, " ");
  return text.length <= 32 ? text : null;
}

/* ---------------- Text conversion ---------------- */

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Plain text → simple HTML: blank lines split paragraphs, single newlines become <br>. */
export function textToHtml(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

const BLOCK = /^(P|DIV|H[1-6]|LI|UL|OL|BLOCKQUOTE|PRE|TABLE|TR|SECTION|ARTICLE)$/;

/** HTML → plain text, keeping paragraph and line breaks. */
export function htmlToText(html: string) {
  if (typeof DOMParser === "undefined") return stripHtml(html);
  const doc = new DOMParser().parseFromString(html, "text/html");
  let out = "";
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += (node.textContent ?? "").replace(/\s+/g, " ");
      return;
    }
    if (!(node instanceof Element)) return;
    if (node.tagName === "BR") {
      out += "\n";
      return;
    }
    const block = BLOCK.test(node.tagName);
    if (block && out && !out.endsWith("\n\n")) out += out.endsWith("\n") ? "\n" : "\n\n";
    node.childNodes.forEach(walk);
    if (block && !out.endsWith("\n\n")) out += out.endsWith("\n") ? "\n" : "\n\n";
  };
  doc.body.childNodes.forEach(walk);
  return out
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** True when HTML uses formatting beyond paragraphs/line breaks (lost when edited as plain text). */
export function isRichHtml(html: string) {
  const tags = html.match(/<\s*([a-z0-9]+)/gi) ?? [];
  return tags.some((t) => !/^<\s*(p|br|div|span)$/i.test(t));
}

/** Images/audio/video count as content for Moodle even without words. */
export function hasEmbeddedMedia(html: string) {
  return /<\s*(img|video|audio)\b/i.test(html);
}

/** Word count close to Moodle's count_words(). */
export function countWords(text: string) {
  return text.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/**
 * Turns the absolute file URLs the WS put into a submission's online text back
 * into Moodle's @@PLUGINFILE@@ placeholder, so the text can be saved unchanged
 * (with draft itemid 0) without losing its embedded files.
 */
export function toPluginfilePlaceholders(html: string, submissionId: number) {
  const url = new RegExp(
    `https?://[^"'\\s<>]+?/(?:webservice/)?pluginfile\\.php/\\d+/assignsubmission_onlinetext/submissions_onlinetext/${submissionId}/`,
    "g"
  );
  return html.replace(url, "@@PLUGINFILE@@/");
}

/* ---------------- Formatting ---------------- */

const WHEN: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

/** Date, weekday and time ("T2, 24/11/2026, 23:59") for deadlines. */
export function formatWhen(unix: number | null | undefined, locale: string) {
  return formatDateTime(unix, locale, WHEN);
}

/* ---------------- Files ---------------- */

/** A kept file could not be downloaded for re-upload. */
export class FileRefetchError extends Error {
  constructor(readonly filename: string) {
    super(filename);
    this.name = "FileRefetchError";
  }
}

/** Download an existing Moodle file (through the proxy) so it can be re-uploaded to a draft area. */
export async function fetchAsFile(f: MoodleFile): Promise<File> {
  const res = await fetch(fileUrl(f.fileurl, { download: true }));
  if (!res.ok) throw new FileRefetchError(f.filename);
  const blob = await res.blob();
  return new File([blob], f.filename, { type: f.mimetype || blob.type });
}

/**
 * A draft itemid that holds no files, chosen like Moodle's
 * file_get_unused_draft_itemid(). Saving with an empty draft area clears the
 * target file area (file_save_draft_area_files deletes every old file that is
 * not in the draft).
 */
export function emptyDraftItemid() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % 999_999_000) + 1_000;
}

/**
 * Warning codes whose detail is a fixed string (or just "assign"): the portal
 * shows its own localised text for them.
 */
const WARNING_KEY: Record<string, string> = {
  submissionnotopen: "assignment.blocked.generic",
  timelimitnotenabled: "assignment.timed.notEnabled",
  opensubmissionexists: "assignment.warning.attemptInProgress",
  submissionnotfoundtoremove: "assignment.warning.nothingToRemove",
};

/**
 * Readable messages from a mod_assign warnings array (empty = success).
 *
 * mod_assign's generate_warning() puts the real, localised reason (the
 * notices) in `item`, escaped with s(); `message` is a fixed English line per
 * code, so it is never shown. submit_for_grading prefixes
 * "User id: …, Assignment id: … Notices:" to the notices. `fallback` replaces
 * a warning with no readable detail.
 */
export function warningMessages(warnings: MoodleWarning[] | null | undefined, t: TFn, fallback: string) {
  return (warnings ?? []).map((w) => {
    const key = w.warningcode ? WARNING_KEY[w.warningcode] : undefined;
    if (key) return t(key);
    const detail = decodeEntities(w.item ?? "");
    const i = detail.indexOf("Notices:");
    const text = (i >= 0 ? detail.slice(i + "Notices:".length) : detail).replace(/<[^>]*>/g, "").trim();
    return text || fallback;
  });
}
