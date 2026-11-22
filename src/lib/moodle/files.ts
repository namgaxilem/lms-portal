import { intlLocale } from "@/lib/format";
import { moodleBase } from "@/lib/public-config";

const PLUGINFILE = /\/(webservice\/pluginfile|pluginfile|tokenpluginfile)\.php\//;

/** True for a Moodle pluginfile URL that needs the authenticated proxy. */
export function isMoodleFile(url: string | null | undefined): url is string {
  const root = moodleBase();
  return !!url && !!root && url.startsWith(`${root}/`) && PLUGINFILE.test(url);
}

/**
 * Browser-usable URL for a Moodle file: pluginfile URLs go through
 * /api/moodle/file (token added server-side); anything else is returned as is.
 */
export function fileUrl(url: string | null | undefined, { download = false } = {}): string {
  if (!url) return "";
  if (!isMoodleFile(url)) return url;
  // Drop any token Moodle embedded; the proxy adds the user's own.
  const clean = url.replace(/([?&])token=[^&#]*&?/, "$1").replace(/[?&]$/, "");
  return `/api/moodle/file?url=${encodeURIComponent(clean)}${download ? "&download=1" : ""}`;
}

/* ---------------- File types & sizes ---------------- */

/** Broad file families, for previews, icons and friendly type labels. */
export type FileKind =
  | "pdf"
  | "image"
  | "video"
  | "audio"
  | "word"
  | "spreadsheet"
  | "presentation"
  | "archive"
  | "text"
  | "other";

const KIND_BY_EXTENSION: Record<string, FileKind> = {
  pdf: "pdf",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  bmp: "image",
  heic: "image",
  mp4: "video",
  mov: "video",
  webm: "video",
  mkv: "video",
  avi: "video",
  mp3: "audio",
  wav: "audio",
  m4a: "audio",
  ogg: "audio",
  aac: "audio",
  doc: "word",
  docx: "word",
  odt: "word",
  rtf: "word",
  xls: "spreadsheet",
  xlsx: "spreadsheet",
  ods: "spreadsheet",
  csv: "spreadsheet",
  ppt: "presentation",
  pptx: "presentation",
  odp: "presentation",
  key: "presentation",
  zip: "archive",
  rar: "archive",
  "7z": "archive",
  gz: "archive",
  tar: "archive",
  txt: "text",
  md: "text",
};

/** Family of a file from its MIME type, falling back to the extension (e.g. a browser File without a type). */
export function fileKind(file: { filename: string; mimetype?: string | null }): FileKind {
  const mime = (file.mimetype ?? "").toLowerCase();
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  const ext = file.filename.toLowerCase().split(".").pop() ?? "";
  if (KIND_BY_EXTENSION[ext]) return KIND_BY_EXTENSION[ext];
  if (mime.startsWith("text/")) return "text";
  return "other";
}

const UNITS = ["B", "KB", "MB", "GB"];

/** Human-readable size ("2.3 MB", "2,3 MB" in Vietnamese); null when unknown. */
export function formatFileSize(bytes: number | null | undefined, locale: string): string | null {
  if (!bytes || bytes <= 0) return null;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  const digits = value < 10 && unit > 0 ? 1 : 0;
  const number = new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: digits }).format(value);
  return `${number} ${UNITS[unit]}`;
}
