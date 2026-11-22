import type { TFn } from "@/i18n/translate";
import type { AccountRole, SessionUser } from "@/lib/moodle/types";

/** Strips HTML tags from Moodle rich-text fields. */
export function stripHtml(html: string) {
  return decodeEntities(html.replace(/<[^>]*>/g, "")).trim();
}

/** Tags that end a word: a line break or the edge of a block. */
const BLOCK_EDGE =
  /<br\s*\/?>|<\/?(?:p|div|li|ul|ol|h[1-6]|tr|td|th|table|blockquote|pre|section|article|header|footer)\b[^>]*>/gi;

/**
 * Moodle HTML as one line of plain text: <style>/<script> blocks dropped,
 * block edges and line breaks become spaces (so words don't run together),
 * whitespace collapsed.
 */
export function plainText(html: string): string {
  return stripHtml(html.replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, " ").replace(BLOCK_EDGE, " ")).replace(
    /\s+/g,
    " "
  );
}

const MEDIA_TAG = /<(?:img|video|audio|iframe|object|embed|svg|math)\b/i;

/** Moodle rich text worth showing: it has text, or media only (an image, a player…). */
export function hasRichContent(html: string | null | undefined): html is string {
  return !!html && (MEDIA_TAG.test(html) || plainText(html) !== "");
}

/* ---------------- Multi-language text ---------------- */

/*
 * Moodle multi-language text, as written for the multilang filters:
 *   <span lang="vi" class="multilang">Mã SV</span><span lang="en" class="multilang">Student ID</span>
 *   {mlang vi}Mã SV{mlang}{mlang other}Student ID{mlang}
 * Some web-service fields come back unfiltered with every language in them:
 * custom profile field names and menu values, and gradebook item names from
 * Moodle 4.5 (PARAM_RAW there).
 */
const MULTILANG_SPAN =
  /<span\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bmultilang\b)(?=[^>]*\blang\s*=\s*["']?([\w-]+))[^>]*>([\s\S]*?)<\/span>/gi;
const MLANG = /\{mlang\s+([\w-]+)\s*\}([\s\S]*?)\{mlang\}/gi;

/** "en_us" / "pt-BR" → "en" / "pt". */
const baseLang = (lang: string) => lang.toLowerCase().split(/[-_]/)[0];

function keepLanguage(text: string, pattern: RegExp, lang: string): string {
  const langs = [...text.matchAll(pattern)].map((m) => baseLang(m[1]));
  if (langs.length === 0) return text;
  // The UI language, else {mlang other}, else the first language given (as the filters fall back).
  const keep = langs.includes(lang) ? lang : langs.includes("other") ? "other" : langs[0];
  return text.replace(pattern, (_, l: string, content: string) => (baseLang(l) === keep ? content : ""));
}

/** Keeps only the `locale` part of multi-language text; other text is returned unchanged. */
export function pickLanguage(text: string, locale: string): string {
  const lang = baseLang(locale);
  return keepLanguage(keepLanguage(text, MULTILANG_SPAN, lang), MLANG, lang);
}

/* ---------------- Search ---------------- */

/**
 * Text folded for accent- and case-insensitive matching, so "ke toan" finds
 * "Kế toán": NFD splits accents into combining marks, which are dropped; đ/Đ
 * has no decomposition and is mapped by hand. Trimmed, so a query and the
 * text it is matched against fold the same way.
 */
export function foldSearch(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").replace(/[đĐ]/g, "d").toLowerCase().trim();
}

/* ---------------- Numbers ---------------- */

/** Plain number in the UI locale ("10", "7,5"), at most `maxDecimals` decimals. */
export function formatNumber(n: number, locale: string, maxDecimals = 2) {
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: maxDecimals }).format(n);
}

/* ---------------- HTML entities ---------------- */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Decodes the HTML entities Moodle's format_string() leaves in plain-text
 * fields ("Tuần 1&amp;2" → "Tuần 1&2"). One pass only, so a literal "&amp;lt;"
 * correctly becomes the text "&lt;". Unknown named entities are left as-is.
 */
export function decodeEntities(s: string): string {
  if (!s || !s.includes("&")) return s;
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, ent: string) => {
    if (ent[0] === "#") {
      const hex = ent[1] === "x" || ent[1] === "X";
      const code = parseInt(ent.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return NAMED_ENTITIES[ent.toLowerCase()] ?? match;
  });
}

/**
 * Moodle fields that are plain text but come back HTML-escaped (they go
 * through format_string). Rich-text fields (summary, description, intro,
 * fullmessagehtml…) are deliberately NOT listed: they are rendered as HTML.
 */
const PLAIN_TEXT_KEYS = new Set([
  "name",
  "fullname",
  "shortname",
  "displayname",
  "fullnamedisplay",
  "coursename",
  "categoryname",
  "coursecategory",
  "activityname",
  "activitystr",
  "sectionname",
  "itemname",
  "title",
  "subject",
  "contexturlname",
  "groupname",
  "sitename",
  "modplural",
]);

/** Recursively decodes entities in the plain-text fields of a Moodle payload. */
export function decodeMoodleText<T>(value: T, key?: string): T {
  if (typeof value === "string") {
    return (key && PLAIN_TEXT_KEYS.has(key) ? decodeEntities(value) : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => decodeMoodleText(v, key)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = decodeMoodleText(v, k);
    return out as T;
  }
  return value;
}

/* ---------------- Names ---------------- */

/** Up to two initials: first + last word ("Nguyen Van An" → "NA"). */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Name used in greetings: Moodle's first name, else the last word of the full name. */
export function greetingName(user: Pick<SessionUser, "fullname" | "firstname">) {
  return user.firstname?.trim() || user.fullname.trim().split(/\s+/).pop() || user.fullname;
}

/** Stable non-negative number for a name, to tint the avatar of someone without a Moodle id. */
export function nameSeed(name: string): number {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) | 0;
  return Math.abs(hash);
}

/* ---------------- Dates ---------------- */

/** BCP-47 tag for Intl. English uses en-GB so day/month order matches Vietnamese. */
export function intlLocale(locale: string) {
  return locale === "en" ? "en-GB" : "vi-VN";
}

const DATE: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };
const DATE_TIME: Intl.DateTimeFormatOptions = { ...DATE, hour: "2-digit", minute: "2-digit" };

/** Calendar date ("22/04/2023") for a unix timestamp in seconds; "" when unset. */
export function formatDate(
  unix: number | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions = DATE
) {
  if (!unix || unix <= 0) return "";
  return new Date(unix * 1000).toLocaleDateString(intlLocale(locale), options);
}

/** Date and time ("22/04/2023, 14:05"); "" when unset. */
export function formatDateTime(
  unix: number | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions = DATE_TIME
) {
  if (!unix || unix <= 0) return "";
  return new Date(unix * 1000).toLocaleString(intlLocale(locale), options);
}

/** Clock time ("14:05"). */
export function formatTime(unix: number, locale: string) {
  return new Date(unix * 1000).toLocaleTimeString(intlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Localized relative time ("vừa xong", "5 phút trước", "hôm qua" / "5 min ago",
 * "yesterday"). Works for future timestamps too; falls back to a calendar date
 * beyond 30 days.
 */
export function timeAgo(unix: number, locale: string) {
  const diff = unix - Date.now() / 1000;
  const abs = Math.abs(diff);
  if (abs >= 30 * 86400) return formatDate(unix, locale);
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), {
    numeric: "auto",
    style: "short",
  });
  if (abs < 60) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.trunc(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.trunc(diff / 3600), "hour");
  return rtf.format(Math.trunc(diff / 86400), "day");
}

/** True when the unix timestamp (seconds) falls on the current calendar day. */
export function isToday(unix: number) {
  return isSameDay(new Date(unix * 1000), new Date());
}

/** True when the unix timestamp (seconds) falls on tomorrow's calendar day. */
export function isTomorrow(unix: number) {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return isSameDay(new Date(unix * 1000), t);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/* ---------------- Durations ---------------- */

/** Human duration with the two largest units ("2 ngày 3 giờ", "1 h 5 min"). */
export function formatDuration(seconds: number, t: TFn) {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(t("common.unit.day", { n: d }));
  if (h) parts.push(t("common.unit.hour", { n: h }));
  if (!d && m) parts.push(t("common.unit.minute", { n: m }));
  if (!parts.length) parts.push(t("common.unit.minute", { n: s >= 60 ? 1 : 0 }));
  return parts.slice(0, 2).join(" ");
}

/** Clock-style duration: "MM:SS", or "H:MM:SS" from an hour. */
export function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/* ---------------- Days ---------------- */

/** Local calendar day of a unix timestamp (seconds) as "YYYY-MM-DD", usable as a key. */
export function dayKey(unix: number) {
  const d = new Date(unix * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgo(unix: number) {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((start(new Date()) - start(new Date(unix * 1000))) / 86_400_000);
}

/**
 * Heading for a past day: "Today" / "Yesterday" (worded by Intl in the current
 * locale, e.g. "Hôm nay", "Hôm qua"), otherwise a weekday date. The year is
 * shown only for days outside the current year.
 */
export function dayLabel(unix: number, locale: string) {
  const ago = daysAgo(unix);
  const tag = intlLocale(locale);
  if (ago === 0 || ago === 1) {
    const word = new Intl.RelativeTimeFormat(tag, { numeric: "auto" }).format(-ago, "day");
    return word.charAt(0).toLocaleUpperCase(tag) + word.slice(1);
  }
  const sameYear = new Date(unix * 1000).getFullYear() === new Date().getFullYear();
  return formatDate(unix, locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

interface DayGroup<T> {
  key: string;
  /** Timestamp of the group's first item (for the heading). */
  time: number;
  items: T[];
}

/** Splits an already-sorted list into consecutive calendar-day groups. */
export function groupByDay<T>(items: T[], timeOf: (item: T) => number): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const time = timeOf(item);
    const key = dayKey(time);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, time, items: [item] });
  }
  return groups;
}

/* ---------------- Roles ---------------- */

/** Highest account role, falling back for sessions created before highestRole existed. */
export function accountRole(
  user: Pick<SessionUser, "highestRole" | "isSiteAdmin"> | null | undefined
): AccountRole {
  return user?.highestRole ?? (user?.isSiteAdmin ? "admin" : "student");
}

export function isStaffRole(role: AccountRole) {
  return role === "admin" || role === "teacher";
}
