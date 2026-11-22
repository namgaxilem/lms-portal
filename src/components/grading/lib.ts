import type { Tone } from "@/components/ui";
import { rawGrade } from "@/components/assignment/lib";
import { moodleClient, portalJson } from "@/lib/client-api";
import { formatNumber } from "@/lib/format";
import type {
  AssignGradesResult,
  AssignParticipant,
  Assignment,
  GuideCriterion,
  RubricCriterion,
  UserGrades,
} from "@/lib/moodle/types";
import type { TFn } from "@/i18n/translate";
import type { GradingFillingsResult, GradingSetup, NoticeKind } from "./types";

export type ParticipantFilter = "all" | "needsGrading" | "submitted" | "notSubmitted";
export const FILTERS: ParticipantFilter[] = ["all", "needsGrading", "submitted", "notSubmitted"];

const WORKFLOW_STATES = [
  "notmarked",
  "inmarking",
  "readyforreview",
  "inreview",
  "readyforrelease",
  "released",
] as const;

/** A known workflow state (gradingstatus of the submission), else "notmarked". */
export function workflowStateOf(s: string | undefined): string {
  return s && (WORKFLOW_STATES as readonly string[]).includes(s) ? s : "notmarked";
}

/** States Moodle offers to anyone with mod/assign:grade. */
const MARKER_STATES: readonly string[] = ["notmarked", "inmarking", "readyforreview"];

/**
 * Workflow states this grader may pick. Moodle's own form offers "in review" /
 * "ready for release" only with mod/assign:reviewgrades or managegrades and
 * "released" only with releasegrades or managegrades, but mod_assign_save_grade
 * does not check, and no 4.1 web service exposes those capabilities. Heuristic:
 * editing teachers and managers (`canRelease`) get every state, other graders
 * the marker states. The current state always stays selectable.
 */
export function workflowOptions(current: string, canRelease: boolean) {
  return WORKFLOW_STATES.filter((s) => canRelease || MARKER_STATES.includes(s) || s === current);
}

/* ---------------- Numbers & grades ---------------- */

type GradeRow = AssignGradesResult["assignments"][number]["grades"][number];

/** "points" (grade > 0), "scale" (grade < 0, a scale id) or "none" (feedback only). */
type GradeType = "points" | "scale" | "none";

export function gradeTypeOf(a: Pick<Assignment, "grade">): GradeType {
  return a.grade > 0 ? "points" : a.grade < 0 ? "scale" : "none";
}

/** Latest-attempt grade row per user id. */
export function latestGrades(result: AssignGradesResult | null | undefined, assignid: number) {
  const map = new Map<number, GradeRow>();
  const rows = result?.assignments.find((a) => a.assignmentid === assignid)?.grades ?? [];
  for (const g of rows) {
    const cur = map.get(g.userid);
    if (!cur || g.attemptnumber >= cur.attemptnumber) map.set(g.userid, g);
  }
  return map;
}

/** Value for an <input type="number"> (always "." decimals), at most 2 decimals. */
export function inputNumber(n: number) {
  return String(Math.round(n * 100) / 100);
}

/** Human grade: scale label, "x / max" points, or null when ungraded. */
export function formatGrade(
  raw: string | null | undefined,
  assignment: Pick<Assignment, "grade">,
  scale: string[] | null | undefined,
  locale: string
): string | null {
  const n = rawGrade(raw);
  if (n === null) return null;
  if (assignment.grade < 0) return scale?.[Math.round(n) - 1] ?? String(Math.round(n));
  if (assignment.grade === 0) return null;
  return `${formatNumber(n, locale)} / ${formatNumber(assignment.grade, locale)}`;
}

/**
 * The student's grade for this assignment is locked or overridden in the
 * gradebook; Moodle then keeps the stored grade (assign::grading_disabled).
 * False when it can't be checked.
 */
export async function gradeLockedInGradebook(courseid: number, cmid: number, userid: number) {
  try {
    const res = await moodleClient<UserGrades>("gradereport_user_get_grade_items", { courseid, userid });
    const item = res.usergrades[0]?.gradeitems.find((i) => i.itemmodule === "assign" && i.cmid === cmid);
    return !!(item && (item.locked || item.gradeislocked || item.gradeisoverridden));
  } catch {
    return false;
  }
}

/* ---------------- Unknown method: remembered block ---------------- */

const BLOCK_TTL_MS = 7 * 24 * 60 * 60_000;
const blockKey = (cmid: number) => `grading:advanced-suspected:${cmid}`;

/**
 * With an unknown method, Moodle ignoring a plain grade means a rubric / guide
 * is probably active, and every further save would reset another student's
 * grade. Remembered in this browser (best effort) so a reload does not lift
 * the block; only consulted while the method is unknown.
 */
export function wasMethodBlocked(cmid: number) {
  try {
    const at = Number(window.localStorage.getItem(blockKey(cmid)));
    return at > 0 && Date.now() - at < BLOCK_TTL_MS;
  } catch {
    return false;
  }
}

export function rememberMethodBlocked(cmid: number) {
  try {
    window.localStorage.setItem(blockKey(cmid), String(Date.now()));
  } catch {
    // Storage unavailable: the block lasts until the page is reloaded.
  }
}

/* ---------------- Participants ---------------- */

export function matchesFilter(p: AssignParticipant, f: ParticipantFilter) {
  if (f === "needsGrading") return p.requiregrading;
  if (f === "submitted") return p.submitted;
  if (f === "notSubmitted") return !p.submitted;
  return true;
}

/** Display name; blind marking hides names and only returns a participant number. */
export function participantName(p: Pick<AssignParticipant, "fullname" | "recordid" | "id">, t: TFn) {
  if (p.fullname) return p.fullname;
  return t("grading.participantNo", { n: p.recordid && p.recordid > 0 ? p.recordid : p.id });
}

/** Submission state → badge tone + i18n key. */
export function statusBadge(p: Pick<AssignParticipant, "submissionstatus" | "requiregrading" | "submitted">): {
  tone: Tone;
  key: string;
} {
  if (p.requiregrading) return { tone: "warning", key: "grading.status.needsGrading" };
  switch (p.submissionstatus) {
    case "submitted":
      return { tone: "success", key: "grading.status.submitted" };
    case "draft":
      return { tone: "primary", key: "grading.status.draft" };
    case "reopened":
      return { tone: "violet", key: "grading.status.reopened" };
    default:
      return p.submitted
        ? { tone: "success", key: "grading.status.submitted" }
        : { tone: "neutral", key: "grading.status.notSubmitted" };
  }
}

/* ---------------- Feedback ---------------- */

/**
 * A feedback plugin ("comments", "file") is enabled for this assignment.
 * get_assignments only lists configs of enabled plugins. When configs are
 * missing, assume enabled: Moodle ignores data sent to a disabled plugin.
 */
export function feedbackPluginEnabled(a: Pick<Assignment, "configs">, plugin: "comments" | "file") {
  if (!a.configs) return true;
  return a.configs.some(
    (c) => c.subtype === "assignfeedback" && c.plugin === plugin && c.name === "enabled" && c.value === "1"
  );
}

/**
 * Feedback HTML from the web service has its embedded files rewritten to
 * webservice/pluginfile.php URLs. Sending it back unchanged must restore the
 * @@PLUGINFILE@@ placeholders, or the images break in Moodle.
 */
export function restorePluginfileUrls(html: string) {
  return html.replace(
    /https?:\/\/[^"'\s]*?\/webservice\/pluginfile\.php\/\d+\/assignfeedback_comments\/feedback\/\d+\//g,
    "@@PLUGINFILE@@/"
  );
}

/** inputClass has a fixed height, so multi-line fields (remarks, feedback) use this instead. */
export const textareaClass =
  "block w-full resize-y rounded-control border border-line bg-surface px-3.5 py-2.5 text-sm text-fg outline-none transition-[border-color,box-shadow] placeholder:text-subtle hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:opacity-60";

/* ---------------- Rubric / marking guide values ---------------- */

export type RubricValue = Record<number, { levelid?: number; remark: string }>;
export type GuideValue = Record<number, { score: string; remark: string }>;

/** Raw rubric score and the best reachable score, used to estimate the grade. */
export function rubricTotals(criteria: RubricCriterion[], value: RubricValue) {
  let total = 0;
  let max = 0;
  for (const c of criteria) {
    if (c.levels.length === 0) continue;
    max += Math.max(...c.levels.map((l) => l.score));
    total += c.levels.find((l) => l.id === value[c.id]?.levelid)?.score ?? 0;
  }
  return { total, max };
}

/** Number entered for a guide criterion, or null when empty / out of range. */
export function guideScore(c: GuideCriterion, value: GuideValue): number | null {
  const raw = value[c.id]?.score ?? "";
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= c.maxscore ? n : null;
}

/* ---------------- Grade form decisions ---------------- */

/**
 * Rubric / guide that can't be graded here: its definition or saved fillings
 * could not be read (saving would wipe the student's fillings), the method is
 * unsupported, or Moodle ignored a plain grade earlier.
 */
export function isAdvancedBlocked(setup: GradingSetup, fillings: GradingFillingsResult | null, methodBlocked: boolean) {
  if (methodBlocked || setup.method === "other") return true;
  const advanced = setup.method === "rubric" || setup.method === "guide";
  return advanced && !setup.notDefined && (!(setup.rubric || setup.guide) || !!fillings?.issue);
}

/** Notices above the grade form, most important first; blocking ones stand alone. */
export function gradeNotices(o: {
  setup: GradingSetup;
  methodBlocked: boolean;
  advancedBlocked: boolean;
  scaleBlocked: boolean;
  gradeLocked: boolean;
  /** Earlier feedback is hidden by marking workflow and this form would replace it. */
  feedbackHidden: boolean;
}): NoticeKind[] {
  if (o.methodBlocked) return ["notApplied"];
  if (o.setup.method === "other") return ["advancedUnsupported"];
  if (o.advancedBlocked) return ["advancedUnavailable"];
  const kinds: NoticeKind[] = [];
  if (o.gradeLocked) kinds.push("gradeLocked");
  if (o.setup.notDefined) kinds.push("notDefined");
  if (o.setup.method === "unknown") kinds.push("methodUnknown");
  if (o.scaleBlocked) kinds.push("scaleUnavailable");
  if (o.feedbackHidden) kinds.push("feedbackHidden");
  return kinds;
}

interface SaveInput {
  assignment: Assignment;
  userid: number;
  team: boolean;
  rubric?: GradingSetup["rubric"];
  guide?: GradingSetup["guide"];
  rubricValue: RubricValue;
  guideValue: GuideValue;
  /** Scale items could not be read: keep the stored grade. */
  scaleBlocked: boolean;
  scaleIdx: number;
  points: string;
  maxgrade: number | null;
  current: number | null;
  workflow: string;
  /** Feedback comments HTML, or null when the comments plugin is off. */
  feedbackHtml: string | null;
}

type SavePayload =
  | {
      args: Record<string, unknown>;
      /** Plain grade (points / scale index) to verify after saving, else null. */
      grade: number | null;
    }
  | { error: string };

/** Validates the form and builds the mod_assign_save_grade arguments, or returns an error key. */
export function buildSavePayload(o: SaveInput): SavePayload {
  const gradeType = gradeTypeOf(o.assignment);
  let grade = -1;
  let advancedgradingdata: Record<string, unknown> | undefined;

  if (o.rubric) {
    if (o.rubric.criteria.some((c) => !o.rubricValue[c.id]?.levelid)) return { error: "grading.errors.rubricIncomplete" };
    grade = 0;
    advancedgradingdata = {
      rubric: {
        criteria: o.rubric.criteria.map((c) => ({
          criterionid: c.id,
          // Remarks are plain text; Moodle stores them as FORMAT_MOODLE whatever is sent.
          fillings: [
            { criterionid: c.id, levelid: o.rubricValue[c.id].levelid, remark: o.rubricValue[c.id].remark ?? "", remarkformat: 0 },
          ],
        })),
      },
    };
  } else if (o.guide) {
    if (o.guide.criteria.some((c) => guideScore(c, o.guideValue) === null)) return { error: "grading.errors.guideInvalid" };
    grade = 0;
    advancedgradingdata = {
      guide: {
        criteria: o.guide.criteria.map((c) => ({
          criterionid: c.id,
          fillings: [
            {
              criterionid: c.id,
              score: guideScore(c, o.guideValue),
              remark: o.guideValue[c.id]?.remark ?? "",
              remarkformat: 0,
            },
          ],
        })),
      },
    };
  } else if (gradeType === "scale") {
    // Without scale items keep whatever grade is stored; only feedback changes.
    grade = o.scaleBlocked ? (o.current ?? -1) : o.scaleIdx;
  } else if (gradeType === "points" && o.points.trim() !== "") {
    const n = Number(o.points);
    if (!Number.isFinite(n) || n < 0 || (o.maxgrade !== null && n > o.maxgrade)) return { error: "grading.errors.pointsRange" };
    grade = n;
  }

  const plugindata: Record<string, unknown> = {};
  if (o.feedbackHtml !== null) plugindata.assignfeedbackcomments_editor = { text: o.feedbackHtml, format: 1 };

  return {
    grade: !o.rubric && !o.guide && grade >= 0 ? grade : null,
    args: {
      assignmentid: o.assignment.id,
      userid: o.userid,
      grade,
      attemptnumber: -1,
      addattempt: false,
      workflowstate: o.assignment.markingworkflow ? o.workflow : "",
      applytoall: o.team,
      plugindata,
      ...(advancedgradingdata && { advancedgradingdata }),
    },
  };
}

/* ---------------- Fetching ---------------- */

async function getGradingJson<T>(url: string): Promise<T> {
  return (await portalJson(url)).data as T;
}

/** GET /api/grading/{cmid} */
export const fetchGradingSetup = (cmid: number) => getGradingJson<GradingSetup>(`/api/grading/${cmid}`);

/** GET /api/grading/{cmid}/fillings?gradeid= */
export const fetchGradingFillings = (cmid: number, gradeid: number) =>
  getGradingJson<GradingFillingsResult>(`/api/grading/${cmid}/fillings?gradeid=${gradeid}`);
