import type { ScormTrack } from "@/lib/moodle/types";

/**
 * Client-side SCORM runtime (the `window.API` / `window.API_1484_11` object a
 * SCO talks to). Holds the CMI data model for ONE SCO launch and hands changed
 * values to `onCommit`, which persists them via mod_scorm_insert_scorm_tracks.
 *
 * Behaviour mirrors Moodle's own player (mod/scorm/datamodels/*.js and the
 * Moodle app's AddonModScormDataModel12): Moodle stores SCORM 1.2 array indexes
 * as `_n.` (cmi.interactions_0.id) and SCORM 2004 ones in dot form
 * (cmi.interactions.0.id), session time is folded into total_time on finish,
 * and SCORM 1.2 status is derived on finish (not attempted → completed,
 * mastery_score → passed/failed). Validation is intentionally lenient: real
 * packages send out-of-spec values and Moodle accepts them.
 */

export type ScormVersion = "1.2" | "2004";
export type ScormMode = "normal" | "review";
/**
 * What the SCO asked for when it terminated (2004 adl.nav.request, 1.2 nav.event).
 * `exit` ends this SCO without flow navigation; `exitAll` (exitAll, suspendAll,
 * abandonAll) leaves the package; `choice` targets a SCO by manifest identifier.
 */
export type NavRequest =
  | { kind: "continue" }
  | { kind: "previous" }
  | { kind: "choice"; target: string }
  | { kind: "exit" }
  | { kind: "exitAll" }
  | null;
type Values = Record<string, string>;

interface RuntimeOptions {
  version: ScormVersion;
  mode: ScormMode;
  /** Moodle `defaultdata` for this SCO (student id/name, entry, credit…). */
  defaults: Values;
  /** Moodle `userdata` for this SCO — previously tracked values. */
  tracked: Values;
  /** Persist changed tracks. Called synchronously from the SCO; must not throw. */
  onCommit: (tracks: ScormTrack[]) => void;
  /** SCO finished (LMSFinish / Terminate), with its navigation request if any. */
  onFinish?: (nav: NavRequest) => void;
  /** Any value the SCO set — lets the UI reflect live status/score. */
  onChange?: (element: string, value: string) => void;
  /** Auto-commit dirty data this long after a SetValue (ms). 0 disables. */
  autocommitMs?: number;
}

/* ---------------- Moodle element name format ---------------- */

const INDEX = /[._](\d+)\./g;
/**
 * Any stored form → dot form: cmi.interactions_0.id (1.2), and the
 * cmi.objectives.N0.id that Moodle preloads for 2004 sequencing objectives
 * (scorm_13lib.php get_scorm_default), both become cmi.objectives.0.id.
 */
const toDot = (el: string) => el.replace(/\.N(\d+)\./g, ".$1.").replace(INDEX, ".$1.");
/**
 * Dot form → the name Moodle's own player stores: `_n.` for SCORM 1.2
 * (scorm_12.js), unchanged dot form for 2004 (scorm_13.js + module.js
 * underscore()), which Moodle's objectives report and resume code expect.
 */
const toStored = (el: string, version: ScormVersion) =>
  version === "1.2" ? el.replace(INDEX, "_$1.") : el;
/** cmi.interactions.0.id → cmi.interactions.n.id */
const toGeneric = (el: string) => el.replace(/\.\d+\./g, ".n.").replace(/\.\d+$/, ".n");

/* ---------------- Durations ---------------- */

/** Parse a SCORM 1.2 timespan (HHHH:MM:SS.SS) or 2004 ISO 8601 duration to seconds. */
export function parseScormDuration(value: string | number | undefined): number {
  const s = String(value ?? "").trim();
  if (!s) return 0;
  const hms = /^(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/.exec(s);
  if (hms) return +hms[1] * 3600 + +hms[2] * 60 + +hms[3];
  const iso =
    /^P(?:(\d+(?:\.\d+)?)Y)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)W)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(
      s
    );
  if (!iso) return 0;
  const [, y, mo, w, d, h, mi, sec] = iso.map((x) => Number(x ?? 0));
  return (
    y * 31_536_000 + mo * 2_592_000 + w * 604_800 + d * 86_400 + h * 3600 + mi * 60 + sec
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Seconds → SCORM 1.2 timespan, e.g. 00:05:30.25 */
function formatTimespan(total: number): string {
  const cents = Math.round((total % 1) * 100);
  const secs = Math.floor(total);
  const out = `${pad(Math.floor(secs / 3600))}:${pad(Math.floor((secs % 3600) / 60))}:${pad(secs % 60)}`;
  return cents ? `${out}.${pad(cents)}` : out;
}

/** Seconds → SCORM 2004 duration, e.g. PT1H5M30.25S */
function formatIsoDuration(total: number): string {
  const secs = Math.round(total * 100) / 100;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.round((secs % 60) * 100) / 100;
  return `PT${h}H${m}M${s}S`;
}

/* ---------------- Data model tables ---------------- */

const CHILDREN: Record<ScormVersion, Record<string, string>> = {
  "1.2": {
    cmi: "core,suspend_data,launch_data,comments,objectives,student_data,student_preference,interactions",
    "cmi.core": "student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,lesson_mode,exit,session_time",
    "cmi.core.score": "raw,min,max",
    "cmi.objectives": "id,score,status",
    "cmi.objectives.n.score": "raw,min,max",
    "cmi.student_data": "mastery_score,max_time_allowed,time_limit_action",
    "cmi.student_preference": "audio,language,speed,text",
    "cmi.interactions": "id,objectives,time,type,correct_responses,weighting,student_response,result,latency",
    "cmi.evaluation.comments": "content,location,time",
  },
  "2004": {
    cmi: "_version,comments_from_learner,comments_from_lms,completion_status,credit,entry,exit,interactions,launch_data,learner_id,learner_name,learner_preference,location,max_time_allowed,mode,objectives,progress_measure,scaled_passing_score,score,session_time,success_status,suspend_data,time_limit_action,total_time",
    "cmi.comments_from_learner": "comment,location,timestamp",
    "cmi.comments_from_lms": "comment,location,timestamp",
    "cmi.interactions": "id,type,objectives,timestamp,correct_responses,weighting,learner_response,result,latency,description",
    "cmi.interactions.n.objectives": "id",
    "cmi.interactions.n.correct_responses": "pattern",
    "cmi.learner_preference": "audio_level,language,delivery_speed,audio_captioning",
    "cmi.objectives": "id,score,success_status,completion_status,progress_measure,description",
    "cmi.objectives.n.score": "scaled,raw,min,max",
    "cmi.score": "scaled,raw,min,max",
  },
};

const READ_ONLY: Record<ScormVersion, RegExp> = {
  "1.2":
    /^cmi\.(_version|core\.(student_id|student_name|credit|entry|total_time|lesson_mode)|launch_data|comments_from_lms|student_data\..+)$/,
  "2004":
    /^(cmi\.(_version|completion_threshold|credit|entry|launch_data|learner_id|learner_name|max_time_allowed|mode|scaled_passing_score|time_limit_action|total_time|comments_from_lms\..+)|adl\.nav\.request_valid\..+)$/,
};

const WRITE_ONLY: Record<ScormVersion, RegExp> = {
  "1.2": /^(cmi\.core\.(exit|session_time)|nav\.event)$/,
  "2004": /^cmi\.(exit|session_time)$/,
};

const VOCAB: Record<string, RegExp> = {
  "cmi.core.lesson_status": /^(passed|completed|failed|incomplete|browsed)$/,
  "cmi.completion_status": /^(completed|incomplete|not attempted|unknown)$/,
  "cmi.success_status": /^(passed|failed|unknown)$/,
};

const ERRORS: Record<string, string> = {
  "0": "No error",
  "101": "General exception",
  "103": "Already initialized",
  "104": "Content instance terminated",
  "112": "Termination before initialization",
  "113": "Termination after termination",
  "122": "Retrieve data before initialization",
  "123": "Retrieve data after termination",
  "132": "Store data before initialization",
  "133": "Store data after termination",
  "142": "Commit before initialization",
  "143": "Commit after termination",
  "201": "Invalid argument error",
  "202": "Element cannot have children",
  "203": "Element not an array - cannot have count",
  "301": "Not initialized",
  "351": "General set failure",
  "401": "Not implemented error",
  "402": "Invalid set value, element is a keyword",
  "403": "Element is read only",
  "404": "Element is write only",
  "405": "Incorrect data type",
  "406": "Data model element type mismatch",
  "407": "Data model element value out of range",
};

/* ---------------- Runtime ---------------- */

type Phase = "new" | "running" | "terminated";

export class ScormRuntime {
  private values: Values = {};
  private committed: Values = {};
  private phase: Phase = "new";
  private error = "0";
  private startedAt = 0;
  private totalTimeSent = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly v: ScormVersion;
  /** Element names that differ between versions. */
  private readonly el: Record<"status" | "raw" | "session" | "total" | "nav", string>;

  constructor(private readonly opts: RuntimeOptions) {
    this.v = opts.version;
    this.el =
      this.v === "1.2"
        ? {
            status: "cmi.core.lesson_status",
            raw: "cmi.core.score.raw",
            session: "cmi.core.session_time",
            total: "cmi.core.total_time",
            nav: "nav.event",
          }
        : {
            status: "cmi.completion_status",
            raw: "cmi.score.raw",
            session: "cmi.session_time",
            total: "cmi.total_time",
            nav: "adl.nav.request",
          };

    for (const [k, v] of Object.entries(opts.defaults)) this.values[toDot(k)] = String(v ?? "");
    // Older portal builds saved 2004 arrays as cmi.objectives_0.*, and that row stays
    // next to the newer dot-form one. Apply other spellings first so the form this
    // version stores always wins, whatever order Moodle returns the rows in.
    const tracked = Object.entries(opts.tracked).filter(([k]) => k.startsWith("cmi."));
    const isStoredForm = ([k]: [string, string]) => toStored(toDot(k), this.v) === k;
    for (const [k, v] of [...tracked.filter((e) => !isStoredForm(e)), ...tracked.filter(isStoredForm)]) {
      this.values[toDot(k)] = String(v ?? "");
    }

    const credit = opts.mode === "normal" ? "credit" : "no-credit";
    if (this.v === "1.2") {
      if (!this.values["cmi.core.lesson_status"]) this.values["cmi.core.lesson_status"] = "not attempted";
      this.values["cmi.core.credit"] = credit;
      this.values["cmi.core.lesson_mode"] = opts.mode;
      this.values["cmi._version"] = "3.4";
    } else {
      if (!this.values["cmi.completion_status"]) this.values["cmi.completion_status"] = "unknown";
      if (!this.values["cmi.success_status"]) this.values["cmi.success_status"] = "unknown";
      this.values["cmi.credit"] = credit;
      this.values["cmi.mode"] = opts.mode;
      this.values["cmi._version"] = "1.0";
    }
    this.values[this.el.session] = "";
    this.committed = { ...this.values };
  }

  /* ---------- Shared implementation ---------- */

  private fail(code: string, ret = "false") {
    this.error = code;
    return ret;
  }

  initialize(param: string): string {
    if (param !== "") return this.fail("201");
    if (this.phase === "running") return this.fail(this.v === "1.2" ? "101" : "103");
    if (this.phase === "terminated") return this.fail(this.v === "1.2" ? "101" : "104");
    this.phase = "running";
    this.startedAt = Date.now();
    this.error = "0";
    return "true";
  }

  getValue(element: string): string {
    if (this.phase !== "running") {
      return this.fail(this.v === "1.2" ? "301" : this.phase === "new" ? "122" : "123", "");
    }
    if (!element) return this.fail(this.v === "1.2" ? "201" : "301", "");
    this.error = "0";

    if (element.endsWith("._children")) {
      const children = CHILDREN[this.v][toGeneric(element.slice(0, -10))];
      return children ?? this.fail(this.v === "1.2" ? "202" : "301", "");
    }
    if (element.endsWith("._count")) return String(this.count(element.slice(0, -7)));
    if (WRITE_ONLY[this.v].test(element)) return this.fail(this.v === "1.2" ? "404" : "405", "");
    if (this.v === "2004" && element.startsWith("adl.nav.request_valid.")) return "unknown";

    if (element in this.values) return this.values[element];
    if (!/^(cmi|adl)\./.test(element)) return this.fail(this.v === "1.2" ? "201" : "401", "");
    // Known-shaped but never set. 2004 reports "not initialized"; 1.2 returns "".
    return this.v === "2004" ? this.fail("403", "") : "";
  }

  setValue(element: string, raw: unknown): string {
    if (this.phase !== "running") {
      return this.fail(this.v === "1.2" ? "301" : this.phase === "new" ? "132" : "133");
    }
    if (!element) return this.fail(this.v === "1.2" ? "201" : "351");
    if (/\._(children|count|version)$/.test(element) || element === "cmi._version") {
      return this.fail(this.v === "1.2" ? "402" : "404");
    }
    if (READ_ONLY[this.v].test(element)) return this.fail(this.v === "1.2" ? "403" : "404");

    let value = String(raw ?? "");
    const vocab = VOCAB[element];
    if (vocab && !vocab.test(value)) return this.fail(this.v === "1.2" ? "405" : "406");
    if (/score\.(raw|min|max|scaled)$|progress_measure$/.test(element) && value !== "") {
      const n = Number(value);
      if (Number.isNaN(n)) return this.fail(this.v === "1.2" ? "405" : "406");
      if (/scaled$/.test(element) && (n < -1 || n > 1)) return this.fail("407");
      if (/progress_measure$/.test(element) && (n < 0 || n > 1)) return this.fail("407");
    }
    // SCORM 1.2 cmi.comments is append-only.
    if (this.v === "1.2" && element === "cmi.comments") value = (this.values[element] ?? "") + value;

    this.values[element] = value;
    this.error = "0";
    this.opts.onChange?.(element, value);
    this.scheduleAutocommit();
    return "true";
  }

  commit(param: string): string {
    if (param !== "") return this.fail("201");
    if (this.phase !== "running") {
      return this.fail(this.v === "1.2" ? "301" : this.phase === "new" ? "142" : "143");
    }
    this.store(false);
    this.error = "0";
    return "true";
  }

  terminate(param: string): string {
    if (param !== "") return this.fail("201");
    if (this.phase !== "running") {
      return this.fail(this.v === "1.2" ? "301" : this.phase === "new" ? "112" : "113");
    }
    this.phase = "terminated";
    this.store(true, true);
    this.error = "0";
    this.opts.onFinish?.(this.navRequest());
    return "true";
  }

  /**
   * Save whatever the SCO has not committed yet (page hide / leaving the player).
   * Records the session time once, but does NOT apply finish-time status rules:
   * the SCO did not say it was done.
   */
  flush(): void {
    if (this.phase !== "running") return;
    this.store(true, false);
  }

  get lastError() {
    return this.error;
  }

  errorString(code: string): string {
    return ERRORS[String(code)] ?? "";
  }

  diagnostic(code: string): string {
    return code ? this.errorString(code) : this.errorString(this.error);
  }

  get isRunning() {
    return this.phase === "running";
  }

  /* ---------- Internals ---------- */

  /** Number of entries in an array element, from the highest index stored. */
  private count(prefix: string): number {
    const re = new RegExp(`^${prefix.replace(/\./g, "\\.")}\\.(\\d+)\\.`);
    let max = -1;
    for (const key of Object.keys(this.values)) {
      const m = re.exec(key);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return max + 1;
  }

  private scheduleAutocommit() {
    const ms = this.opts.autocommitMs ?? 0;
    if (!ms || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (this.phase === "running") this.store(false);
    }, ms);
  }

  private navRequest(): NavRequest {
    const nav = this.values[this.el.nav] ?? "";
    if (nav === "continue" || nav === "previous") return { kind: nav };
    if (this.v === "1.2") return null;
    const choice = /^\{target=([^}]+)\}(choice|jump)$/.exec(nav);
    if (choice) return { kind: "choice", target: choice[1] };
    if (nav === "exit" || nav === "abandon") return { kind: "exit" };
    if (nav === "exitAll" || nav === "suspendAll" || nav === "abandonAll") return { kind: "exitAll" };
    return null;
  }

  /** Apply Moodle's finish-time rules for status. */
  private applyFinishRules() {
    const val = this.values;
    if (this.v === "1.2") {
      if (val["cmi.core.lesson_status"] === "not attempted") {
        val["cmi.core.lesson_status"] = "completed";
      }
      const mastery = val["cmi.student_data.mastery_score"] ?? "";
      const raw = val["cmi.core.score.raw"] ?? "";
      if (this.opts.mode === "normal" && val["cmi.core.credit"] === "credit" && mastery !== "" && raw !== "") {
        val["cmi.core.lesson_status"] =
          parseFloat(raw) >= parseFloat(mastery) ? "passed" : "failed";
      }
    } else {
      const threshold = val["cmi.completion_threshold"] ?? "";
      const progress = val["cmi.progress_measure"] ?? "";
      if (threshold !== "" && progress !== "") {
        val["cmi.completion_status"] =
          parseFloat(progress) >= parseFloat(threshold) ? "completed" : "incomplete";
      }
      const passing = val["cmi.scaled_passing_score"] ?? "";
      const scaled = val["cmi.score.scaled"] ?? "";
      if (passing !== "" && scaled !== "") {
        val["cmi.success_status"] = parseFloat(scaled) >= parseFloat(passing) ? "passed" : "failed";
      }
    }
  }

  private store(withTotalTime: boolean, finishRules = false) {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    if (finishRules) this.applyFinishRules();

    const tracks: ScormTrack[] = [];
    for (const [key, value] of Object.entries(this.values)) {
      if (!key.startsWith("cmi.") || key === this.el.session) continue;
      if (READ_ONLY[this.v].test(key) || /\._(children|count)$/.test(key)) continue;
      if (this.committed[key] === value) continue;
      tracks.push({ element: toStored(key, this.v), value });
      this.committed[key] = value;
    }

    if (withTotalTime && !this.totalTimeSent) {
      this.totalTimeSent = true;
      // Trust the SCO's own session time; fall back to wall-clock time since Initialize.
      let session = parseScormDuration(this.values[this.el.session]);
      if (!session && this.startedAt) session = (Date.now() - this.startedAt) / 1000;
      const total = parseScormDuration(this.values[this.el.total]) + session;
      const formatted = this.v === "1.2" ? formatTimespan(total) : formatIsoDuration(total);
      this.values[this.el.total] = formatted;
      tracks.push({ element: this.el.total, value: formatted });
    }

    if (tracks.length) this.opts.onCommit(tracks);
  }
}

/* ---------------- window API objects ---------------- */

/**
 * The object placed on `window.API` (1.2) or `window.API_1484_11` (2004). It
 * delegates to whichever runtime is current, so the player can swap SCOs while
 * the SCO frames keep a stable reference.
 */
export function createScormApi(version: ScormVersion, current: () => ScormRuntime | null) {
  const call = <T,>(fn: (rt: ScormRuntime) => T, fallback: T) => {
    const rt = current();
    return rt ? fn(rt) : fallback;
  };
  const impl = {
    initialize: (p = "") => call((rt) => rt.initialize(String(p)), "false"),
    terminate: (p = "") => call((rt) => rt.terminate(String(p)), "false"),
    getValue: (el: string) => call((rt) => rt.getValue(String(el)), ""),
    setValue: (el: string, v: unknown) => call((rt) => rt.setValue(String(el), v), "false"),
    commit: (p = "") => call((rt) => rt.commit(String(p)), "false"),
    lastError: () => call((rt) => rt.lastError, "301"),
    errorString: (c: string) => call((rt) => rt.errorString(c), ""),
    diagnostic: (c: string) => call((rt) => rt.diagnostic(c), ""),
  };

  if (version === "1.2") {
    return {
      LMSInitialize: impl.initialize,
      LMSFinish: impl.terminate,
      LMSGetValue: impl.getValue,
      LMSSetValue: impl.setValue,
      LMSCommit: impl.commit,
      LMSGetLastError: impl.lastError,
      LMSGetErrorString: impl.errorString,
      LMSGetDiagnostic: impl.diagnostic,
    };
  }
  return {
    version: "1.0",
    Initialize: impl.initialize,
    Terminate: impl.terminate,
    GetValue: impl.getValue,
    SetValue: impl.setValue,
    Commit: impl.commit,
    GetLastError: impl.lastError,
    GetErrorString: impl.errorString,
    GetDiagnostic: impl.diagnostic,
  };
}
