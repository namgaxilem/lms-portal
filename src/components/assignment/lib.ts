import type {
  AssignPlugin,
  AssignSubmission,
  Assignment,
  MoodleFile,
  SubmissionStatus,
} from "@/lib/moodle/types";
import { fileUrl } from "@/lib/moodle/files";

/** Moodle external_warnings item (returned by save/submit/remove calls). */
export interface WsWarning {
  item?: string;
  itemid?: number;
  warningcode?: string;
  message: string;
}

/** Translation function shape from useT(). */
export type TFn = (key: string, params?: Record<string, string | number>) => string;

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

export function onlineText(plugins: AssignPlugin[] | undefined) {
  const field = plugin(plugins, "onlinetext")?.editorfields?.find((f) => f.name === "onlinetext");
  return field && field.text.trim() ? field : undefined;
}

export function submissionFiles(plugins: AssignPlugin[] | undefined): MoodleFile[] {
  return (
    plugin(plugins, "file")
      ?.fileareas?.find((a) => a.area === "submission_files")
      ?.files?.filter((f) => f.filename !== ".") ?? []
  );
}

export function feedbackComments(plugins: AssignPlugin[] | undefined) {
  const field = plugin(plugins, "comments")?.editorfields?.find((f) => f.name === "comments");
  return field?.text.trim() ? field.text : undefined;
}

/** Every file from feedback plugins (feedback_files, annotated PDF…). */
export function feedbackFiles(plugins: AssignPlugin[] | undefined): MoodleFile[] {
  return (plugins ?? [])
    .filter((p) => p.type !== "comments")
    .flatMap((p) => p.fileareas ?? [])
    .flatMap((a) => a.files ?? [])
    .filter((f) => f.filename !== ".");
}

/** Moodle raw grade string → number, or null when not graded. */
export function rawGrade(grade: string | undefined | null) {
  if (grade === undefined || grade === null || grade === "") return null;
  const n = Number(grade);
  return Number.isFinite(n) && n >= 0 ? n : null;
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
  if (typeof DOMParser === "undefined") {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h\d|li)>/gi, "\n\n")
      .replace(/<[^>]*>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
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

/** Word count close to Moodle's count_words(). */
export function countWords(text: string) {
  const words = text.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
  return words.length;
}

/* ---------------- Formatting ---------------- */

export function formatBytes(bytes: number | undefined) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

export function formatDateTime(unix: number, locale: string) {
  return new Date(unix * 1000).toLocaleString(locale === "vi" ? "vi-VN" : "en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Human duration with the two largest units ("2 ngày 3 giờ"). */
export function formatDuration(seconds: number, t: TFn) {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(t("assignment.unit.day", { n: d }));
  if (h) parts.push(t("assignment.unit.hour", { n: h }));
  if (!d && m) parts.push(t("assignment.unit.minute", { n: m }));
  if (!parts.length) parts.push(t("assignment.unit.minute", { n: s >= 60 ? 1 : 0 }));
  return parts.slice(0, 2).join(" ");
}

/** HH:MM:SS countdown. */
export function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/* ---------------- Files ---------------- */

export function isImage(f: MoodleFile) {
  return (f.mimetype ?? "").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(f.filename);
}

export function isPreviewable(f: MoodleFile) {
  return isImage(f) || f.mimetype === "application/pdf" || /\.pdf$/i.test(f.filename);
}

/** Download an existing Moodle file (through the proxy) so it can be re-uploaded to a draft area. */
export async function fetchAsFile(f: MoodleFile): Promise<File> {
  const res = await fetch(fileUrl(f.fileurl, { download: true }));
  if (!res.ok) throw new Error(f.filename);
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

/** Readable messages from a Moodle warnings array (empty = success). */
export function warningMessages(warnings: WsWarning[] | null | undefined) {
  return (warnings ?? [])
    .map((w) => {
      const msg = w.message || w.warningcode || "";
      // submit_for_grading prefixes "User id: …, Assignment id: … Notices:" to the real notices.
      const i = msg.indexOf("Notices:");
      return (i >= 0 ? msg.slice(i + 8) : msg).trim() || w.warningcode || "";
    })
    .filter(Boolean);
}
