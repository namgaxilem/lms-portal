import { moodleClient } from "@/lib/client-api";
import type {
  CourseModuleInfo,
  CourseSection,
  Scorm,
  ScormAccessInfo,
  ScormSco,
  ScormScoesResult,
  ScormsByCoursesResult,
  ScormTrack,
  ScormUserDataResult,
} from "@/lib/moodle/types";
import { parseScormDuration, type ScormMode, type ScormVersion } from "./runtime";

/** Everything about the activity that does not change during a session. */
export interface ScormPackage {
  scorm: Scorm;
  version: ScormVersion;
  contextid: number;
  scoes: ScormSco[];
  access: ScormAccessInfo;
  attemptCount: number;
}

/**
 * Per-SCO data for one attempt, as element → value maps. `tracked` is what the
 * runtime resumes from; `progress` (when present) is the unfiltered record the
 * TOC and attempt status are computed from.
 */
export type AttemptData = Record<
  number,
  {
    defaults: Record<string, string>;
    tracked: Record<string, string>;
    progress?: Record<string, string>;
  }
>;

export interface TocItem {
  sco: ScormSco;
  level: number;
  launchable: boolean;
  /** notattempted | incomplete | completed | passed | failed | browsed */
  status: string;
  score?: number;
  /** Tracked total time in seconds. */
  time: number;
}

const toMap = (tracks: ScormTrack[]) =>
  Object.fromEntries(tracks.map((t) => [t.element, String(t.value ?? "")]));

/** The activity is not open yet / already closed for this user. */
export class ScormWindowError extends Error {
  constructor(
    readonly kind: "notopen" | "closed",
    readonly at: number,
    readonly activityName: string
  ) {
    super(kind);
  }
}

/** Load activity settings, package location, SCO tree and the user's attempt count. */
export async function loadPackage(
  cmid: number,
  userId: number,
  courseHint?: number
): Promise<ScormPackage> {
  const courseid =
    courseHint ||
    (await moodleClient<CourseModuleInfo>("core_course_get_course_module", { cmid })).cm.course;

  const [byCourse, sections] = await Promise.all([
    moodleClient<ScormsByCoursesResult>("mod_scorm_get_scorms_by_courses", {
      courseids: [courseid],
    }),
    moodleClient<CourseSection[]>("core_course_get_contents", {
      courseid,
      options: [
        { name: "cmid", value: cmid },
        { name: "excludecontents", value: true },
      ],
    }),
  ]);

  const scorm = byCourse.scorms.find((s) => s.coursemodule === cmid);
  if (!scorm) throw new Error("SCORM activity not found or not accessible");
  const contextid = sections.flatMap((s) => s.modules).find((m) => m.id === cmid)?.contextid;
  if (!contextid) throw new Error("Moodle did not return the activity context (needs Moodle 3.10+)");

  let scoes: ScormScoesResult, access: ScormAccessInfo, attempts: { attemptscount: number };
  try {
    [scoes, access, attempts] = await Promise.all([
      moodleClient<ScormScoesResult>("mod_scorm_get_scorm_scoes", { scormid: scorm.id }),
      moodleClient<ScormAccessInfo>("mod_scorm_get_scorm_access_information", {
        scormid: scorm.id,
      }).catch(() => ({}) as ScormAccessInfo),
      moodleClient<{ attemptscount: number }>("mod_scorm_get_scorm_attempt_count", {
        scormid: scorm.id,
        userid: userId,
      }),
    ]);
  } catch (e) {
    // Outside the open/close window Moodle refuses these calls (staff may be
    // exempt, so only the refusal decides). Report it as a gate, not an error.
    const now = Date.now() / 1000;
    if (scorm.timeopen && scorm.timeopen > now) {
      throw new ScormWindowError("notopen", scorm.timeopen, scorm.name);
    }
    if (scorm.timeclose && scorm.timeclose < now) {
      throw new ScormWindowError("closed", scorm.timeclose, scorm.name);
    }
    throw e;
  }

  return {
    scorm,
    version: scorm.version === "SCORM_1.3" ? "2004" : "1.2",
    contextid,
    scoes: scoes.scoes,
    access,
    attemptCount: attempts.attemptscount,
  };
}

export async function loadAttemptData(
  pkg: ScormPackage,
  userId: number,
  attempt: number
): Promise<AttemptData> {
  const res = await moodleClient<ScormUserDataResult>("mod_scorm_get_scorm_user_data", {
    scormid: pkg.scorm.id,
    attempt,
  });
  const out: AttemptData = {};
  for (const sco of res.data) {
    out[sco.scoid] = { defaults: toMap(sco.defaultdata), tracked: toMap(sco.userdata) };
  }

  // SCORM 2004 (RTE 4.2.8): Moodle only returns a SCO's tracks for re-launch
  // when it exited with "suspend", so a finished SCO looks untouched. Fetch the
  // unfiltered tracks for status, score and time; the runtime still starts it
  // ab-initio from `tracked`.
  if (pkg.version === "2004") {
    const launchable = new Set(pkg.scoes.filter((s) => s.launch).map((s) => s.id));
    await Promise.all(
      Object.entries(out)
        .filter(([id, d]) => launchable.has(Number(id)) && d.tracked["cmi.exit"] !== "suspend")
        .map(async ([id, d]) => {
          try {
            const r = await moodleClient<{ data: { tracks: ScormTrack[] } }>(
              "mod_scorm_get_scorm_sco_tracks",
              { scoid: Number(id), userid: userId, attempt }
            );
            if (r.data.tracks.length) d.progress = { ...d.tracked, ...toMap(r.data.tracks) };
          } catch {
            // Fall back to the filtered data.
          }
        })
    );
  }
  return out;
}

export const isIncomplete = (status?: string) =>
  !status || status === "notattempted" || status === "incomplete" || status === "browsed";

export const isDone = (status?: string) => status === "completed" || status === "passed";

/** SCO status from Moodle's computed `status`, falling back to raw CMI values. */
export function scoStatus(tracked: Record<string, string> | undefined, version: ScormVersion) {
  if (!tracked) return "notattempted";
  if (tracked.status) return tracked.status;
  if (version === "1.2") {
    const s = tracked["cmi.core.lesson_status"];
    return !s || s === "not attempted" ? "notattempted" : s;
  }
  const success = tracked["cmi.success_status"];
  if (success === "passed" || success === "failed") return success;
  const c = tracked["cmi.completion_status"];
  return !c || c === "not attempted" || c === "unknown" ? "notattempted" : c;
}

export function scoScore(tracked: Record<string, string> | undefined, version: ScormVersion) {
  const raw =
    tracked?.score_raw ?? tracked?.[version === "1.2" ? "cmi.core.score.raw" : "cmi.score.raw"];
  return raw === undefined || raw === "" ? undefined : Number(raw);
}

/** Organization the package starts in (the one holding `scorm.launch`). */
export function currentOrganization(pkg: ScormPackage): string {
  const launch = pkg.scoes.find((s) => s.id === pkg.scorm.launch);
  return launch?.organization || pkg.scoes.find((s) => s.parent === "/")?.identifier || "";
}

/** Flattened, depth-annotated TOC for one organization, with attempt status. */
export function buildToc(pkg: ScormPackage, data: AttemptData): TocItem[] {
  const org = currentOrganization(pkg);
  const scoes = pkg.scoes.filter((s) => s.parent !== "/" && (!org || s.organization === org));
  const children = new Map<string, ScormSco[]>();
  for (const s of scoes) {
    const list = children.get(s.parent) ?? [];
    list.push(s);
    children.set(s.parent, list);
  }

  const out: TocItem[] = [];
  const walk = (parent: string, level: number) => {
    for (const sco of (children.get(parent) ?? []).sort((a, b) => a.sortorder - b.sortorder)) {
      const tracked = data[sco.id]?.progress ?? data[sco.id]?.tracked;
      // Moodle marks SCOs hidden by the manifest with isvisible=false.
      if (tracked?.isvisible === "false") continue;
      out.push({
        sco,
        level,
        launchable: !!sco.launch,
        status: scoStatus(tracked, pkg.version),
        score: scoScore(tracked, pkg.version),
        time: parseScormDuration(
          tracked?.total_time ??
            tracked?.[pkg.version === "1.2" ? "cmi.core.total_time" : "cmi.total_time"]
        ),
      });
      walk(sco.identifier, level + 1);
    }
  };
  walk(org, 0);
  return out;
}

/** Attempt-level status: complete when every launchable SCO is done/failed. */
export function attemptIncomplete(toc: TocItem[]) {
  return toc.some((i) => i.launchable && isIncomplete(i.status));
}

/**
 * Which attempt to open and in which mode — port of Moodle's scorm_check_mode
 * (and the Moodle app's determineAttemptAndMode).
 */
export function decideAttempt(
  scorm: Scorm,
  lastAttempt: number,
  lastIncomplete: boolean,
  wantNew: boolean,
  canSave: boolean
): { attempt: number; mode: ScormMode; isNew: boolean } {
  const attempt = scorm.maxattempt ? Math.min(lastAttempt, scorm.maxattempt) : lastAttempt;
  if (!canSave) return { attempt: Math.max(attempt, 1), mode: "normal", isNew: false };
  const hasAttemptsLeft = !scorm.maxattempt || attempt < scorm.maxattempt;
  if (scorm.forcenewattempt === 2 && attempt > 0 && hasAttemptsLeft) {
    // Configured to force a new attempt on every entry.
    return { attempt: attempt + 1, mode: "normal", isNew: true };
  }

  let startNew = wantNew;
  if (attempt === 0) startNew = true;
  else if (lastIncomplete) startNew = false;
  else if (scorm.forcenewattempt === 1) startNew = true;

  if (startNew && hasAttemptsLeft) {
    return { attempt: attempt + 1, mode: "normal", isNew: true };
  }
  return { attempt, mode: lastIncomplete ? "normal" : "review", isNew: false };
}

/** First SCO to open: in normal mode the first unfinished one, else the first launchable. */
export function firstSco(toc: TocItem[], mode: ScormMode, preferredId?: number) {
  const launchable = toc.filter((i) => i.launchable);
  return (
    (preferredId ? launchable.find((i) => i.sco.id === preferredId) : undefined) ??
    (mode === "normal" ? launchable.find((i) => isIncomplete(i.status)) : undefined) ??
    launchable[0]
  );
}

/** Same-origin URL of a SCO's launch file (plus manifest parameters). */
export function scoUrl(pkg: ScormPackage, sco: ScormSco): string {
  let launch = sco.launch;
  let params = String(sco.extradata?.find((e) => e.element === "parameters")?.value ?? "");
  if (params) {
    if (params.startsWith("?")) params = params.slice(1);
    launch += (launch.includes("?") ? "&" : "?") + params;
  }
  if (/^(https?:)?\/\//i.test(launch) || launch.toLowerCase().startsWith("www.")) return launch;
  const path = launch.replace(/^\/+/, "");
  return `/api/scorm/content/${pkg.contextid}/${pkg.scorm.revision ?? 0}/${path}`;
}

/* ---------------- Track saving ---------------- */

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Serial, coalescing writer for mod_scorm_insert_scorm_tracks. SCOs call
 * commit synchronously and expect "true", so saves are queued here; failures
 * are retried with backoff and newer values always win over older ones.
 */
export function createTrackSaver(onState: (s: SaveState) => void) {
  // key `${scoId}:${attempt}` → element → value
  const pending = new Map<string, Map<string, string | number>>();
  let running: Promise<void> | null = null;
  let failures = 0;

  async function run() {
    while (pending.size) {
      const [key, tracks] = pending.entries().next().value!;
      pending.delete(key);
      const [scoid, attempt] = key.split(":").map(Number);
      onState("saving");
      try {
        await moodleClient(
          "mod_scorm_insert_scorm_tracks",
          {
            scoid,
            attempt,
            tracks: [...tracks].map(([element, value]) => ({ element, value: String(value) })),
          },
          { keepalive: true }
        );
        failures = 0;
      } catch {
        // Put the batch back without clobbering anything newer that arrived meanwhile.
        const merged = new Map(tracks);
        for (const [el, v] of pending.get(key) ?? []) merged.set(el, v);
        pending.set(key, merged);
        failures++;
        onState("error");
        if (failures > 3) return; // give up until the next save request
        await new Promise((r) => setTimeout(r, 1500 * failures));
      }
    }
    onState("saved");
  }

  function kick() {
    running ??= run().finally(() => {
      running = null;
    });
    return running;
  }

  return {
    save(scoId: number, attempt: number, tracks: ScormTrack[]) {
      if (!tracks.length) return;
      const key = `${scoId}:${attempt}`;
      const map = pending.get(key) ?? new Map();
      for (const t of tracks) map.set(t.element, t.value);
      pending.set(key, map);
      failures = 0;
      kick();
    },
    /**
     * Page is going away: send everything queued right now as keepalive requests.
     * The serial queue would hold these back behind a request still in flight
     * (typically the SCO's own commit from its unload handler) and they'd be lost.
     */
    flushNow() {
      for (const [key, tracks] of pending) {
        const [scoid, attempt] = key.split(":").map(Number);
        moodleClient(
          "mod_scorm_insert_scorm_tracks",
          {
            scoid,
            attempt,
            tracks: [...tracks].map(([element, value]) => ({ element, value: String(value) })),
          },
          { keepalive: true }
        ).catch(() => {});
      }
      pending.clear();
    },
    /** Resolves once everything queued so far has been sent (or given up on). */
    async idle() {
      while (running) await running;
    },
  };
}
