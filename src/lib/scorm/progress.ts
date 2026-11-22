"use client";
import { moodleCached, moodleClient } from "@/lib/client-api";
import { parseScormDuration } from "@/lib/scorm/runtime";
import { scoProgress, scoStatus, toTrackMap } from "@/lib/scorm/player-data";
import type { ScormScoesResult, ScormsByCoursesResult, ScormTrack } from "@/lib/moodle/types";

export interface ScormProgress {
  /** 0–100: cmi.progress_measure (2004), else 100 when completed/passed, else 0. */
  percent: number;
  /** Total learning time recorded by the package, in seconds. */
  seconds: number;
  /** completed/passed on every launchable SCO. */
  done: boolean;
}

const MIN = 60_000;
const DONE = new Set(["completed", "passed"]);

/**
 * A learner's progress in one SCORM activity without launching it:
 * activity → SCOs → unfiltered tracks of the latest attempt. `attempt: 0` makes
 * Moodle pick the last attempt itself (scorm_get_last_attempt), so no attempt
 * count is needed. Returns null when nothing is tracked yet or the activity is
 * outside its open/close window (Moodle then omits `version`).
 */
export async function loadScormProgress(cmid: number, courseid: number, userid: number): Promise<ScormProgress | null> {
  const { scorms } = await moodleCached<ScormsByCoursesResult>("mod_scorm_get_scorms_by_courses", { courseids: [courseid] }, 5 * MIN);
  const scorm = scorms.find((s) => s.coursemodule === cmid);
  if (!scorm?.version) return null;
  const { scoes } = await moodleCached<ScormScoesResult>("mod_scorm_get_scorm_scoes", { scormid: scorm.id }, 5 * MIN);
  const launchable = scoes.filter((s) => s.scormtype === "sco" && s.launch);
  if (!launchable.length) return null;
  const version = scorm.version === "SCORM_1.3" ? "2004" : "1.2";

  const perSco = await Promise.all(
    launchable.map(async (sco) => {
      const r = await moodleClient<{ data: { tracks: ScormTrack[] } }>("mod_scorm_get_scorm_sco_tracks", {
        scoid: sco.id,
        userid,
        attempt: 0,
      });
      // Empty tracks (warning "notattempted"): no status was ever stored.
      if (!r.data.tracks.length) return null;
      const t = toTrackMap(r.data.tracks);
      const done = DONE.has(scoStatus(t, version)) || DONE.has(t["cmi.success_status"] ?? "");
      const measure = scoProgress(t) ?? 0;
      return {
        percent: done ? 100 : measure * 100,
        seconds: parseScormDuration(t.total_time ?? t["cmi.total_time"] ?? t["cmi.core.total_time"]),
        done,
      };
    })
  );
  if (perSco.every((x) => x === null)) return null;

  const items = perSco.map((x) => x ?? { percent: 0, seconds: 0, done: false });
  return {
    percent: Math.round(items.reduce((s, x) => s + x.percent, 0) / items.length),
    seconds: items.reduce((s, x) => s + x.seconds, 0),
    done: items.every((x) => x.done),
  };
}
