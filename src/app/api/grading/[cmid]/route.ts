import { NextResponse } from "next/server";
import { moodleCall, MoodleError } from "@/lib/moodle/client";
import { gradingServiceCall, hasGradingToken } from "@/lib/moodle/service-token";
import { getToken } from "@/lib/session";
import type {
  AssignmentsResult,
  GradingFilling,
  GradingMeta,
  GuideCriterion,
  RubricCriterion,
} from "@/lib/moodle/types";

interface CmInfo {
  cm: {
    id: number;
    course: number;
    instance: number;
    modname: string;
    /** Only returned to users with moodle/course:manageactivities. */
    scale?: string;
    advancedgrading?: { area: string; method: string }[];
  };
}

interface DefinitionsResult {
  areas: {
    areaname: string;
    activemethod?: string;
    definitions: {
      id: number;
      method: string;
      name: string;
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
}

interface InstancesResult {
  instances: {
    id: number;
    itemid: number;
    status: number;
    timemodified: number;
    rubric?: { criteria?: { criterionid: number; levelid?: number; remark?: string }[] };
    guide?: { criteria?: { criterionid: number; score: number; remark?: string }[] };
  }[];
}

interface GradesResult {
  assignments: { assignmentid: number; grades: { id: number; userid: number; attemptnumber: number }[] }[];
}

/** gradingform_instance status: ACTIVE = 1, NEEDUPDATE = 2. */
const LIVE_INSTANCE = new Set([1, 2]);

const parseScale = (scale?: string) =>
  scale ? scale.split(",").map((s) => s.trim()).filter(Boolean) : null;

/**
 * Grading metadata for one assignment: grade type (points / scale / rubric /
 * marking guide), the rubric or guide definition, and the current fillings
 * for `?userid=`.
 *
 * Authorization uses the caller's own token (list_participants requires the
 * grading capability). Rubric definitions and scale items come from the
 * optional read-only MOODLE_GRADING_TOKEN service; only the shaped result is
 * returned, never raw privileged responses.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/grading/[cmid]">) {
  const token = await getToken();
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { cmid: cmidParam } = await ctx.params;
  const cmid = Number(cmidParam);
  const userParam = new URL(request.url).searchParams.get("userid");
  const userid = userParam && /^\d+$/.test(userParam) ? Number(userParam) : null;
  if (!Number.isInteger(cmid) || cmid <= 0) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  try {
    const { cm } = await moodleCall<CmInfo>(token, "core_course_get_course_module", { cmid });
    if (cm.modname !== "assign") {
      return NextResponse.json({ error: "Not an assignment" }, { status: 400 });
    }

    // Throws (required_capability_exception) unless the caller can grade.
    await moodleCall(token, "mod_assign_list_participants", {
      assignid: cm.instance,
      groupid: 0,
      filter: "",
      limit: 1,
      onlyids: true,
    });

    const assignments = await moodleCall<AssignmentsResult>(token, "mod_assign_get_assignments", {
      courseids: [cm.course],
    });
    const assign = assignments.courses
      .flatMap((c) => c.assignments)
      .find((a) => a.id === cm.instance);
    if (!assign) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

    // Editing teachers already get scale + advanced grading from their own call.
    let scale = cm.scale;
    let advanced = cm.advancedgrading;
    if ((scale === undefined || advanced === undefined) && hasGradingToken()) {
      const privileged = await gradingServiceCall<CmInfo>("core_course_get_course_module", { cmid });
      scale ??= privileged.cm.scale;
      advanced ??= privileged.cm.advancedgrading;
    }

    const rawMethod = advanced?.find((a) => a.area === "submissions")?.method || "";
    const method: GradingMeta["method"] =
      rawMethod === "rubric" || rawMethod === "guide" ? rawMethod : "simple";
    const meta: GradingMeta = {
      method,
      maxgrade: assign.grade > 0 ? assign.grade : null,
      scale: assign.grade < 0 ? parseScale(scale) : null,
      complete: true,
    };
    // Without the helper token we cannot see rubric/scale details for
    // non-editing teachers; tell the UI so it can explain instead of guessing.
    if (advanced === undefined || (assign.grade < 0 && !meta.scale)) meta.complete = false;

    if (method !== "simple") {
      if (!hasGradingToken()) {
        meta.complete = false;
        return NextResponse.json({ data: meta });
      }
      const defs = await gradingServiceCall<DefinitionsResult>("core_grading_get_definitions", {
        cmids: [cmid],
        areaname: "submissions",
        activeonly: true,
      });
      const def = defs.areas
        .find((a) => a.areaname === "submissions")
        ?.definitions.find((d) => d.method === method);
      if (!def) {
        // The method is chosen but the teacher never defined the rubric/guide.
        meta.notDefined = true;
        return NextResponse.json({ data: meta });
      }

      if (method === "rubric" && def.rubric) {
        const criteria: RubricCriterion[] = [...def.rubric.rubric_criteria]
          .sort((a, b) => a.sortorder - b.sortorder)
          .map((c) => ({
            id: c.id,
            description: c.description,
            levels: [...c.levels].sort((a, b) => a.score - b.score),
          }));
        meta.rubric = { definitionid: def.id, name: def.name, criteria };
      }
      if (method === "guide" && def.guide) {
        const criteria: GuideCriterion[] = [...def.guide.guide_criteria]
          .sort((a, b) => a.sortorder - b.sortorder)
          .map((c) => ({
            id: c.id,
            shortname: c.shortname,
            description: c.description ?? "",
            descriptionmarkers: c.descriptionmarkers ?? "",
            maxscore: c.maxscore,
          }));
        const comments = [...(def.guide.guide_comments ?? [])]
          .sort((a, b) => a.sortorder - b.sortorder)
          .map((c) => c.description);
        meta.guide = { definitionid: def.id, name: def.name, criteria, comments };
      }

      if (userid) meta.fillings = await currentFillings(token, cm.instance, userid, def.id, method);
    }

    return NextResponse.json({ data: meta });
  } catch (e) {
    const err = e as MoodleError;
    const forbidden = /capability|nopermission|required/i.test(`${err.errorcode} ${err.message}`);
    return NextResponse.json(
      { error: err.message, errorcode: err.errorcode },
      { status: forbidden ? 403 : 400 }
    );
  }
}

/** Fillings of the student's latest grade, matched by grade id (= instance itemid). */
async function currentFillings(
  token: string,
  assignid: number,
  userid: number,
  definitionid: number,
  method: "rubric" | "guide"
): Promise<GradingFilling[]> {
  const grades = await moodleCall<GradesResult>(token, "mod_assign_get_grades", {
    assignmentids: [assignid],
  });
  const grade = grades.assignments
    .find((a) => a.assignmentid === assignid)
    ?.grades.filter((g) => g.userid === userid)
    .sort((a, b) => b.attemptnumber - a.attemptnumber)[0];
  if (!grade) return [];

  const { instances } = await gradingServiceCall<InstancesResult>(
    "core_grading_get_gradingform_instances",
    { definitionid, since: 0 }
  );
  const instance = instances
    .filter((i) => i.itemid === grade.id && LIVE_INSTANCE.has(i.status))
    .sort((a, b) => b.timemodified - a.timemodified)[0];
  if (!instance) return [];

  if (method === "rubric") {
    return (instance.rubric?.criteria ?? []).map((c) => ({
      criterionid: c.criterionid,
      levelid: c.levelid,
      remark: c.remark ?? "",
    }));
  }
  return (instance.guide?.criteria ?? []).map((c) => ({
    criterionid: c.criterionid,
    score: c.score,
    remark: c.remark ?? "",
  }));
}
