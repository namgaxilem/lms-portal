import "server-only";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { moodleCall, MoodleError } from "@/lib/moodle/client";
import { gradingServiceCall, type GradingIssue } from "@/lib/moodle/service-token";
import { clearSession } from "@/lib/session";
import { decodeEntities } from "@/lib/format";
import type {
  AssignmentsResult,
  CourseModuleInfo,
  GradingFilling,
  GuideCriterion,
  MoodleWarning,
  RubricCriterion,
} from "@/lib/moodle/types";
import type { GradingFillingsResult, GradingSetup } from "@/components/grading/types";

/* ---------------- Moodle response shapes ---------------- */

type Cm = CourseModuleInfo["cm"];

interface DefinitionsResult {
  areas: {
    areaname: string;
    definitions: {
      id: number;
      method: string;
      name: string;
      /** gradingform_controller: DRAFT = 10, READY = 20. */
      status: number;
      rubric?: {
        rubric_criteria: {
          id: number;
          sortorder: number;
          description: string;
          levels: { id: number; score: number; definition: string }[];
        }[];
      };
      guide?: {
        guide_criteria: {
          id: number;
          sortorder: number;
          shortname: string;
          description?: string;
          descriptionmarkers?: string;
          maxscore: number;
        }[];
        guide_comments?: { id: number; sortorder: number; description: string }[];
      };
    }[];
  }[];
  /**
   * A definition the service user may not see is skipped with a warning
   * (drafts, or "allow users to preview" off without moodle/grade:managegradingforms).
   */
  warnings?: MoodleWarning[];
}

interface InstancesResult {
  /** Only ACTIVE instances are returned (get_all_active_instances). */
  instances: {
    itemid: number;
    timemodified: number;
    rubric?: { criteria?: { criterionid: number; levelid?: number; remark?: string }[] };
    guide?: { criteria?: { criterionid: number; score: number; remark?: string }[] };
  }[];
}

const DEFINITION_READY = 20;

/* ---------------- Errors ---------------- */

/** An error with the HTTP status the route should answer with. */
class GradingRouteError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/**
 * Maps failures of the caller's own Moodle calls to HTTP responses. Grading
 * token failures never get here: they degrade inside loadSetup/loadFillings.
 */
export async function errorResponse(e: unknown) {
  if (e instanceof GradingRouteError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  if (e instanceof MoodleError) {
    const code = e.errorcode ?? "";
    if (code === "invalidtoken") {
      // Expired / revoked user token: end the session like /api/moodle does.
      await clearSession();
      return NextResponse.json({ error: e.message, errorcode: code }, { status: 401 });
    }
    // postForm reports non-2xx Moodle responses with the HTTP status as errorcode.
    if (/^\d{3}$/.test(code)) return NextResponse.json({ error: "Moodle is unreachable" }, { status: 502 });
    if (code === "invalidrecord") return NextResponse.json({ error: e.message, errorcode: code }, { status: 404 });
    const forbidden = /nopermission|requirelogin|accessexception|notenrol|capability/i.test(code);
    return NextResponse.json({ error: e.message, errorcode: code }, { status: forbidden ? 403 : 400 });
  }
  console.error("[grading] request failed", e);
  return NextResponse.json({ error: "Moodle is unreachable" }, { status: 502 });
}

/** Positive integer from a route / query parameter, else null. */
export function parseId(value: string | null | undefined) {
  return value && /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : null;
}

/* ---------------- Small TTL caches (per server process) ---------------- */

const MINUTE = 60_000;

function ttlCache<K, V>(ttl: number, max = 500) {
  const map = new Map<K, { at: number; value: V }>();
  return {
    get(key: K) {
      const hit = map.get(key);
      return hit && Date.now() - hit.at < ttl ? hit.value : undefined;
    },
    set(key: K, value: V) {
      if (map.size >= max) {
        const now = Date.now();
        for (const [k, v] of map) if (now - v.at >= ttl) map.delete(k);
        if (map.size >= max) map.delete(map.keys().next().value as K);
      }
      map.set(key, { at: Date.now(), value });
    },
  };
}

const gateCache = ttlCache<string, Cm>(MINUTE);
const setupCache = ttlCache<number, GradingSetup>(MINUTE);

/* ---------------- Authorization ---------------- */

/**
 * Resolves the course module with the caller's own token and checks they may
 * see grades in this assignment: mod_assign_list_participants requires
 * mod/assign:view plus mod/assign:viewgrades or mod/assign:grade. Privileged
 * data is only read after this passes. Cached briefly per token + cmid so
 * switching students does not repeat the check.
 */
export async function authorize(token: string, cmid: number): Promise<Cm> {
  const key = `${createHash("sha256").update(token).digest("hex").slice(0, 32)}:${cmid}`;
  const cached = gateCache.get(key);
  if (cached) return cached;

  const { cm } = await moodleCall<CourseModuleInfo>(token, "core_course_get_course_module", { cmid });
  if (cm.modname !== "assign") throw new GradingRouteError(404, "Not an assignment");
  await moodleCall(token, "mod_assign_list_participants", {
    assignid: cm.instance,
    groupid: 0,
    filter: "",
    limit: 1,
    onlyids: true,
  });
  gateCache.set(key, cm);
  return cm;
}

/* ---------------- Text ---------------- */

/**
 * Moodle formats rubric / guide texts and remarks with format_text (FORMAT_MOODLE
 * turns newlines into <br />, escapes &…), but teachers write them as plain
 * text. Back to plain text, keeping line breaks.
 */
function plainText(html: string | null | undefined) {
  if (!html) return "";
  const text = html
    .replace(/<br\s*\/?>\s*\n?/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>\s*/gi, "\n")
    .replace(/<[^>]*>/g, "");
  return decodeEntities(text)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ---------------- Setup ---------------- */

/**
 * How the assignment is graded. Editing teachers get the grading method and
 * scale from their own core_course_get_course_module; everything else comes
 * from the optional grading token. Token failures are reported as `issue`
 * (the response stays 200) so the UI can fall back to simple grading.
 */
export async function loadSetup(token: string, cm: Cm): Promise<GradingSetup> {
  const cached = setupCache.get(cm.id);
  if (cached) return cached;

  const { courses } = await moodleCall<AssignmentsResult>(token, "mod_assign_get_assignments", {
    courseids: [cm.course],
    includenotenrolledcourses: true,
  });
  const assign = courses.flatMap((c) => c.assignments).find((a) => a.id === cm.instance);
  if (!assign) throw new GradingRouteError(404, "Assignment not found");

  let issue: GradingIssue | undefined;
  let scale = cm.scale;
  let advanced = cm.advancedgrading;
  // Moodle only returns `scale` for scale-graded activities, so only ask when it matters.
  const needScale = assign.grade < 0 && scale === undefined;
  if (needScale || advanced === undefined) {
    const res = await gradingServiceCall<CourseModuleInfo>("core_course_get_course_module", { cmid: cm.id });
    if (res.ok) {
      scale ??= res.data.cm.scale;
      advanced ??= res.data.cm.advancedgrading;
    } else {
      issue = res.issue;
    }
  }
  if (advanced === undefined) issue ??= "unavailable";

  const active = advanced?.find((a) => a.area === "submissions")?.method;
  const setup: GradingSetup = {
    // Any other active method (a third-party gradingform plugin) is advanced too: Moodle would ignore a plain grade.
    method:
      advanced === undefined ? "unknown" : !active ? "simple" : active === "rubric" || active === "guide" ? active : "other",
    maxgrade: assign.grade > 0 ? assign.grade : null,
    scale:
      assign.grade < 0 && scale
        ? scale.split(",").map((s) => decodeEntities(s.trim())).filter(Boolean)
        : null,
  };
  if (needScale && !setup.scale) issue ??= "unavailable";

  if (setup.method === "rubric" || setup.method === "guide") {
    const defs = await gradingServiceCall<DefinitionsResult>("core_grading_get_definitions", {
      cmids: [cm.id],
      areaname: "submissions",
      activeonly: true,
    });
    const shaped = defs.ok ? shapeDefinition(defs.data, setup.method, cm.id) : { issue: defs.issue };
    if ("issue" in shaped) issue ??= shaped.issue;
    else Object.assign(setup, shaped);
  }

  if (issue) setup.issue = issue;
  // notDefined is not cached either: the rubric may be marked ready any moment.
  else if (!setup.notDefined) setupCache.set(cm.id, setup);
  return setup;
}

const warnedCmids = new Set<number>();

/**
 * Rubric / guide definition, or notDefined when it is missing or still a draft
 * (Moodle then grades directly). A definition Moodle withheld from the service
 * user (warning for this cmid) is an issue instead: it may well be ready, and
 * a plain grade would then reset the student's grade.
 */
function shapeDefinition(
  result: DefinitionsResult,
  method: "rubric" | "guide",
  cmid: number
): Pick<GradingSetup, "rubric" | "guide" | "notDefined"> | { issue: GradingIssue } {
  const def = result.areas
    .find((a) => a.areaname === "submissions")
    ?.definitions.find((d) => d.method === method);
  if (!def) {
    const warnings = result.warnings?.filter((w) => w.itemid === cmid) ?? [];
    // Drafts are reported as "… required to view draft definitions" (fixed English text in 4.1–4.5).
    if (warnings.length === 0 || warnings.some((w) => /draft/i.test(w.message))) return { notDefined: true };
    const warning = warnings[0];
    if (!warnedCmids.has(cmid)) {
      warnedCmids.add(cmid);
      console.warn(
        `[grading] core_grading_get_definitions withheld the ${method} of cm ${cmid}: ${warning.message || warning.warningcode}. ` +
          "Give the grading service user moodle/grade:managegradingforms."
      );
    }
    return { issue: "unavailable" };
  }
  if (def.status !== DEFINITION_READY) return { notDefined: true };

  if (method === "rubric" && def.rubric) {
    const criteria: RubricCriterion[] = [...def.rubric.rubric_criteria]
      .sort((a, b) => a.sortorder - b.sortorder)
      .map((c) => ({
        id: c.id,
        description: plainText(c.description),
        levels: [...c.levels]
          .sort((a, b) => a.score - b.score)
          .map((l) => ({ id: l.id, score: l.score, definition: plainText(l.definition) })),
      }));
    return { rubric: { definitionid: def.id, name: decodeEntities(def.name), criteria } };
  }
  if (method === "guide" && def.guide) {
    const criteria: GuideCriterion[] = [...def.guide.guide_criteria]
      .sort((a, b) => a.sortorder - b.sortorder)
      .map((c) => ({
        id: c.id,
        shortname: plainText(c.shortname),
        description: plainText(c.description),
        descriptionmarkers: plainText(c.descriptionmarkers),
        maxscore: c.maxscore,
      }));
    const comments = [...(def.guide.guide_comments ?? [])]
      .sort((a, b) => a.sortorder - b.sortorder)
      .map((c) => plainText(c.description))
      .filter(Boolean);
    return { guide: { definitionid: def.id, name: decodeEntities(def.name), criteria, comments } };
  }
  return { notDefined: true };
}

/* ---------------- Fillings ---------------- */

/**
 * Saved rubric / guide fillings of one grade (assign_grades.id = instance
 * itemid). The grade id comes from the client's mod_assign_get_grades; it can
 * only select among this definition's instances, which the gate allows the
 * caller to see.
 */
export async function loadFillings(setup: GradingSetup, gradeid: number): Promise<GradingFillingsResult> {
  const def = setup.rubric ?? setup.guide;
  if (!def) return { fillings: [], ...(setup.issue && { issue: setup.issue }) };

  // Unfiltered: the remarks go into the grading form and are saved back as they are.
  const res = await gradingServiceCall<InstancesResult>(
    "core_grading_get_gradingform_instances",
    { definitionid: def.definitionid, since: 0 },
    { filter: false }
  );
  if (!res.ok) return { fillings: [], issue: res.issue };

  const instance = res.data.instances
    .filter((i) => i.itemid === gradeid)
    .sort((a, b) => b.timemodified - a.timemodified)[0];
  if (!instance) return { fillings: [] };

  const fillings: GradingFilling[] = setup.rubric
    ? (instance.rubric?.criteria ?? []).map((c) => ({
        criterionid: c.criterionid,
        levelid: c.levelid,
        remark: plainText(c.remark),
      }))
    : (instance.guide?.criteria ?? []).map((c) => ({
        criterionid: c.criterionid,
        score: c.score,
        remark: plainText(c.remark),
      }));
  return { fillings };
}
