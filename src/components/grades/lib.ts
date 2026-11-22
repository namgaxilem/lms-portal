import { hasRichContent, pickLanguage, plainText, stripHtml } from "@/lib/format";
import { moduleRoute } from "@/lib/moodle/course-outline";
import type { GradeItem } from "@/lib/moodle/types";

type GradeRowKind = "course" | "category" | "item";

/** A grade item normalised for display. */
export interface GradeRow {
  id: number;
  kind: GradeRowKind;
  /** Sanitised item name; null for category/course totals without one. */
  name: string | null;
  module: string | null;
  cmid?: number;
  /** Text grade without icon markup ("7,50", "B+", "Submitted on…"); null when ungraded. */
  display: string | null;
  raw: number | null;
  /** Pass/fail from Moodle's pass icon; null when the item has no pass grade. */
  passed: boolean | null;
  /** Max grade, only when the course shows the range. */
  max: number | null;
  /** 0–100, from Moodle's percentage or graderaw within the range; null when unknown. */
  percent: number | null;
  feedback: string | null;
  dateGraded: number | null;
  hidden: boolean;
  needsUpdate: boolean;
  rank: number | null;
  numUsers: number | null;
}

const UNGRADED = new Set(["", "-", "–", "—"]);

/** Pass/fail from the icon Moodle prepends to gradeformatted (4.1: fa-check/fa-times, 4.5: fa-xmark, image icons: i/valid). */
function passState(html: string): boolean | null {
  const tags = html.match(/<[^>]+>/g)?.join(" ") ?? "";
  if (!tags) return null;
  if (/fa-times|fa-xmark|text-danger|i\/invalid/.test(tags)) return false;
  if (/fa-check|text-success|i\/valid/.test(tags)) return true;
  return null;
}

/** Parses Moodle's localised percentage ("85,00 %", "85.00 %"). */
function parsePercent(value: string | undefined): number | null {
  const match = value?.match(/-?\d+(?:[.,]\d+)?/);
  if (!match) return null;
  const n = Number(match[0].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function kindOf(itemtype: string): GradeRowKind {
  if (itemtype === "course") return "course";
  if (itemtype === "category") return "category";
  return "item";
}

/**
 * A grade item for display. `locale` picks the UI language's part of the item
 * name: from Moodle 4.5 the name is raw HTML and may hold every language of
 * the multilang filter.
 */
export function normaliseGradeItem(item: GradeItem, locale: string): GradeRow {
  const formatted = item.gradeformatted ?? "";
  const text = stripHtml(formatted);
  const raw = typeof item.graderaw === "number" ? item.graderaw : null;
  // Moodle shows "Error" while the grade still needs a regrade.
  const display = item.gradeneedsupdate || UNGRADED.has(text) ? null : text;
  const hasRange = typeof item.grademin === "number" && typeof item.grademax === "number" && item.grademax > item.grademin;
  const percent =
    display === null
      ? null
      : (parsePercent(item.percentageformatted) ??
        (raw !== null && hasRange ? ((raw - item.grademin!) / (item.grademax! - item.grademin!)) * 100 : null));
  const name = item.itemname ? plainText(pickLanguage(item.itemname, locale)) : "";
  const feedback = hasRichContent(item.feedback) ? item.feedback : null;
  return {
    id: item.id,
    kind: kindOf(item.itemtype),
    name: name || null,
    module: item.itemmodule || null,
    cmid: item.cmid,
    display,
    raw,
    passed: display === null ? null : passState(formatted),
    max: hasRange ? item.grademax! : null,
    percent,
    feedback,
    dateGraded: item.gradedategraded && item.gradedategraded > 0 ? item.gradedategraded : null,
    hidden: !!item.gradeishidden && display === null,
    needsUpdate: !!item.gradeneedsupdate,
    rank: typeof item.rank === "number" && item.rank > 0 ? item.rank : null,
    numUsers: typeof item.numusers === "number" && item.numusers > 0 ? item.numusers : null,
  };
}

export interface CourseGradeSummary {
  /** Rows to list (activity, manual and category items), in gradebook order. */
  rows: GradeRow[];
  total: GradeRow | null;
  /** Activity/manual items that have a grade, out of all of them. */
  graded: number;
  gradable: number;
  /** Most recently graded activity/manual item. */
  latest: GradeRow | null;
}

export function summariseGrades(items: GradeItem[], locale: string): CourseGradeSummary {
  const all = items.map((item) => normaliseGradeItem(item, locale));
  const rows = all.filter((r) => r.kind !== "course");
  const activities = rows.filter((r) => r.kind === "item");
  const withGrade = activities.filter((r) => r.display !== null);
  const latest = withGrade.reduce<GradeRow | null>(
    (best, r) => (r.dateGraded && r.dateGraded > (best?.dateGraded ?? 0) ? r : best),
    null
  );
  return {
    rows,
    total: all.find((r) => r.kind === "course") ?? null,
    graded: withGrade.length,
    gradable: activities.length,
    latest,
  };
}

/** Portal page for a graded activity, when Moodle sent its course module. */
export function gradeItemHref(row: Pick<GradeRow, "cmid" | "module">, courseId: number): string | null {
  if (!row.cmid) return null;
  return moduleRoute({ id: row.cmid, modname: row.module ?? "" }, courseId);
}

/** Text of a gradereport_overview course total, or null when there is none. */
export function overviewGradeText(grade: string | undefined | null): string | null {
  if (!grade) return null;
  const text = stripHtml(grade);
  return UNGRADED.has(text) ? null : text;
}
