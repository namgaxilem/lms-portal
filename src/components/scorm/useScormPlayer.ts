"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useSession } from "@/components/providers/SessionProvider";
import { moodleClient } from "@/lib/client-api";
import { isModuleDone, isTracked } from "@/lib/moodle/course-outline";
import type { CourseModule, ScormSco } from "@/lib/moodle/types";
import { ScormRuntime, createScormApi, type NavRequest, type ScormMode } from "@/lib/scorm/runtime";
import {
  attemptIncomplete,
  buildToc,
  createTrackSaver,
  decideAttempt,
  firstSco,
  loadAttemptData,
  loadModule,
  loadPackage,
  scoUrl,
  ScormUnavailableError,
  type AttemptData,
  type SaveState,
  type ScormPackage,
  type ScormPlacement,
  type TocItem,
} from "@/lib/scorm/player-data";

/** What is being played right now; kept in a ref for callbacks fired by the SCO. */
export interface PlayContext {
  pkg: ScormPackage;
  attempt: number;
  mode: ScormMode;
  canSave: boolean;
}

export type Gate =
  | { kind: "loading" }
  | { kind: "playing" }
  /** The SCO asked to leave the package (exitAll / suspendAll). */
  | { kind: "ended" }
  | { kind: "done"; attempt: number; canNew: boolean }
  | { kind: "locked" }
  | { kind: "notopen" | "closed"; at?: number }
  /** Moodle does not list the activity for this user (deleted, hidden, no access). */
  | { kind: "notfound" }
  /** Moodle too old to return the activity context (before 3.10). */
  | { kind: "nocontext" }
  | { kind: "nosco" }
  | { kind: "unsupported" };

export interface ScoFrameInfo {
  scoId: number;
  title: string;
  src: string;
  key: number;
}

/** Wall-clock span of the current SCO launch; `end` is set once it terminates. */
export interface SessionSpan {
  start: number;
  end?: number;
}

/**
 * Moodle activity completion of the SCORM for this user: null when not tracked
 * (no completion, or staff, who get istrackeduser=false).
 */
export function completionState(cm: CourseModule | null): "done" | "pending" | null {
  if (!cm || !isTracked(cm) || cm.completiondata?.istrackeduser === false) return null;
  return isModuleDone(cm) ? "done" : "pending";
}

/** Reflect a SetValue in the TOC immediately, before Moodle recomputes status. */
function applyLive(item: TocItem, element: string, value: string): TocItem {
  if (element === "cmi.core.lesson_status") {
    return { ...item, status: value === "not attempted" ? "notattempted" : value };
  }
  if (element === "cmi.success_status" && (value === "passed" || value === "failed")) {
    return { ...item, status: value };
  }
  if (element === "cmi.completion_status" && item.status !== "passed" && item.status !== "failed") {
    return {
      ...item,
      status: value === "completed" || value === "incomplete" ? value : "notattempted",
    };
  }
  if ((element === "cmi.core.score.raw" || element === "cmi.score.raw") && value !== "") {
    return { ...item, score: Number(value) };
  }
  if (element === "cmi.progress_measure" && value !== "") {
    return { ...item, progress: Number(value) };
  }
  return item;
}

/** SCO to open after `scoId` terminated with `nav` (or `auto` when it asked for nothing). */
function navTarget(order: ScormSco[], scoId: number, nav: NavRequest, auto: boolean) {
  if (nav?.kind === "choice") return order.find((s) => s.identifier === nav.target);
  const idx = order.findIndex((s) => s.id === scoId);
  if (idx < 0) return undefined;
  if (nav?.kind === "previous") return order[idx - 1];
  if (nav?.kind === "continue" || (!nav && auto)) return order[idx + 1];
  return undefined;
}

/**
 * Lifecycle of the native SCORM player: boot (load package, pick attempt and
 * mode like Moodle's scorm_check_mode), SCO launches with the runtime behind
 * window.API / API_1484_11, navigation requests and track persistence.
 */
export function useScormPlayer(cmid: number, courseHint?: number) {
  const { user } = useSession();

  const [bootKey, setBootKey] = useState(0);
  const [pkg, setPkg] = useState<ScormPackage | null>(null);
  const [placement, setPlacement] = useState<ScormPlacement | null>(null);
  const [cm, setCm] = useState<CourseModule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<Gate>({ kind: "loading" });
  const [play, setPlay] = useState<PlayContext | null>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [frame, setFrame] = useState<ScoFrameInfo | null>(null);
  const [session, setSession] = useState<SessionSpan | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saver] = useState(() => createTrackSaver(setSaveState));

  const runtimeRef = useRef<ScormRuntime | null>(null);
  const playRef = useRef<PlayContext | null>(null);
  const cmRef = useRef<CourseModule | null>(null);
  const orderRef = useRef<ScormSco[]>([]);
  const switchingRef = useRef(false);
  const aliveRef = useRef(true);
  const onFinishRef = useRef<(scoId: number, nav: NavRequest) => void>(() => {});

  const fail = useCallback((e: unknown) => {
    if (aliveRef.current) setError((e as Error).message);
  }, []);

  /* ---------------- Moodle activity completion (header chip) ---------------- */

  /** Re-read completion while it is tracked but not complete yet (e.g. complete-on-view). */
  const syncCompletion = useCallback(
    (courseId: number) => {
      if (completionState(cmRef.current) !== "pending") return;
      loadModule(courseId, cmid)
        .then((fresh) => {
          if (!fresh || !aliveRef.current) return;
          cmRef.current = fresh;
          setCm(fresh);
        })
        .catch(() => {});
    },
    [cmid]
  );

  /* ---------------- SCO lifecycle ---------------- */

  const refreshToc = useCallback(async () => {
    const ctx = playRef.current;
    if (!ctx) return;
    await saver.idle();
    try {
      const data = await loadAttemptData(ctx.pkg, user.id, ctx.attempt);
      if (aliveRef.current) setToc(buildToc(ctx.pkg, data));
    } catch {
      // Keep the live TOC; Moodle will catch up on the next load.
    }
    syncCompletion(ctx.pkg.courseId);
  }, [saver, user.id, syncCompletion]);

  const launch = useCallback(
    async (sco: ScormSco, ctx: PlayContext, preloaded?: AttemptData) => {
      switchingRef.current = true;
      try {
        // Unmount the current SCO first: its unload handler calls LMSFinish on
        // the still-installed runtime, so its data is queued before we move on.
        flushSync(() => setFrame(null));
        runtimeRef.current?.flush();
        runtimeRef.current = null;
        await saver.idle();

        // Fresh data so `entry`, suspend_data and statuses reflect what was just saved.
        const data = preloaded ?? (await loadAttemptData(ctx.pkg, user.id, ctx.attempt));
        if (!aliveRef.current) return;
        let items = buildToc(ctx.pkg, data);
        const entry = data[sco.id] ?? { defaults: {}, tracked: {} };

        if (ctx.canSave) {
          // For 2004 `tracked` is filtered (suspend only); the unfiltered record says
          // whether the first launch was already stamped (Moodle never overwrites it).
          if (!(entry.progress ?? entry.tracked)["x.start.time"]) {
            saver.save(sco.id, ctx.attempt, [
              { element: "x.start.time", value: String(Math.floor(Date.now() / 1000)) },
            ]);
          }
          if (sco.scormtype === "asset") {
            // Assets never call the API; Moodle marks them complete on launch.
            const element = ctx.pkg.version === "1.2" ? "cmi.core.lesson_status" : "cmi.completion_status";
            saver.save(sco.id, ctx.attempt, [{ element, value: "completed" }]);
            items = items.map((i) => (i.sco.id === sco.id ? { ...i, status: "completed" } : i));
          }
        }
        setToc(items);

        runtimeRef.current = new ScormRuntime({
          version: ctx.pkg.version,
          mode: ctx.mode,
          defaults: entry.defaults,
          tracked: entry.tracked,
          autocommitMs: 30_000,
          onCommit: (tracks) => {
            if (ctx.canSave) saver.save(sco.id, ctx.attempt, tracks);
          },
          onChange: (element, value) =>
            setToc((prev) => prev.map((i) => (i.sco.id === sco.id ? applyLive(i, element, value) : i))),
          onFinish: (nav) => onFinishRef.current(sco.id, nav),
        });

        // Logs the launch and sets "viewed" completion, like Moodle's player.php.
        moodleClient("mod_scorm_launch_sco", { scormid: ctx.pkg.scorm.id, scoid: sco.id })
          .then(() => syncCompletion(ctx.pkg.courseId))
          .catch(() => {});
        setSession({ start: Date.now() });
        setFrame({ scoId: sco.id, title: sco.title, src: scoUrl(ctx.pkg, sco), key: Date.now() });
      } catch (e) {
        fail(e);
      } finally {
        switchingRef.current = false;
      }
    },
    [saver, user.id, syncCompletion, fail]
  );

  /** The SCO asked to leave the package: drop its frame and show the ended state. */
  const leave = useCallback(async () => {
    // The SCO already terminated, so its unload handler can no longer change the data.
    flushSync(() => setFrame(null));
    runtimeRef.current = null;
    setGate({ kind: "ended" });
    await refreshToc();
  }, [refreshToc]);

  /** SCO called LMSFinish/Terminate: follow its navigation request (or `auto`). */
  useEffect(() => {
    onFinishRef.current = (scoId, nav) => {
      const ctx = playRef.current;
      if (switchingRef.current || !aliveRef.current || !ctx) return;
      const target = navTarget(orderRef.current, scoId, nav, !!ctx.pkg.scorm.auto);
      // We are inside the SCO's own API call; leave its frame alone until it returns.
      setTimeout(() => {
        if (target) {
          launch(target, ctx);
          return;
        }
        setSession((s) => (s && !s.end ? { ...s, end: Date.now() } : s));
        if (nav?.kind === "exitAll") leave();
        else refreshToc();
      }, 0);
    };
  }, [launch, leave, refreshToc]);

  const start = useCallback(
    async (p: ScormPackage, attempt: number, mode: ScormMode, isNew: boolean, preloaded?: AttemptData) => {
      setGate({ kind: "loading" });
      try {
        const canSave = p.access.cansavetrack !== false && mode === "normal";
        const data = preloaded ?? (await loadAttemptData(p, user.id, attempt, { fresh: isNew }));
        const items = buildToc(p, data);
        const ctx: PlayContext = { pkg: p, attempt, mode, canSave };
        playRef.current = ctx;
        orderRef.current = items.filter((i) => i.launchable).map((i) => i.sco);
        setPlay(ctx);
        setToc(items);
        const first = firstSco(items, mode, isNew ? p.scorm.launch : undefined);
        if (!first) {
          setGate({ kind: "nosco" });
          return;
        }
        setGate({ kind: "playing" });
        await launch(first.sco, ctx, data);
      } catch (e) {
        fail(e);
      }
    },
    [launch, user.id, fail]
  );

  /** Pick attempt + mode like Moodle's scorm_check_mode, then start or ask. */
  const prepare = useCallback(
    async (p: ScormPackage, wantNew: boolean) => {
      setGate({ kind: "loading" });
      try {
        const canSave = p.access.cansavetrack !== false;
        const last = p.scorm.maxattempt ? Math.min(p.attemptCount, p.scorm.maxattempt) : p.attemptCount;
        let lastData: AttemptData | undefined;
        let lastIncomplete = true;
        if (last > 0) {
          lastData = await loadAttemptData(p, user.id, last);
          lastIncomplete = attemptIncomplete(buildToc(p, lastData));
        }
        const d = decideAttempt(p.scorm, last, lastIncomplete, wantNew, canSave);
        if (d.mode === "review" && !wantNew) {
          const max = p.scorm.maxattempt ?? 0;
          const noneLeft = !!max && d.attempt >= max;
          if (noneLeft && p.scorm.lastattemptlock) setGate({ kind: "locked" });
          else setGate({ kind: "done", attempt: d.attempt, canNew: !noneLeft });
          return;
        }
        // Resuming the attempt just read: no need to fetch it again.
        await start(p, d.attempt, d.mode, d.isNew, !d.isNew && d.attempt === last ? lastData : undefined);
      } catch (e) {
        fail(e);
      }
    },
    [start, user.id, fail]
  );

  /* ---------------- Boot ---------------- */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await loadPackage(cmid, user.id, courseHint);
        if (cancelled) return;
        setPkg(p);
        setPlacement(p);
        cmRef.current = p.cm;
        setCm(p.cm);
        moodleClient("mod_scorm_view_scorm", { scormid: p.scorm.id }).catch(() => {});

        if (p.scorm.version && !/^SCORM_1\.[23]$/.test(p.scorm.version)) {
          setGate({ kind: "unsupported" });
        } else {
          await prepare(p, false);
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ScormUnavailableError) {
          setPlacement(e.placement);
          setGate(e.kind === "notopen" || e.kind === "closed" ? { kind: e.kind, at: e.at } : { kind: e.kind });
        } else {
          setError((e as Error).message);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cmid, courseHint, user.id, prepare, bootKey]);

  // Expose the SCORM API where the SCO looks for it (parent window).
  const version = pkg?.version;
  useEffect(() => {
    if (!version) return;
    const w = window as unknown as Record<string, unknown>;
    const name = version === "2004" ? "API_1484_11" : "API";
    w[name] = createScormApi(version, () => runtimeRef.current);
    return () => {
      delete w[name];
    };
  }, [version]);

  // Save on tab close / navigation away. Removing the iframe (unmount) lets the SCO
  // run its own unload → LMSFinish first; flush() only catches what it left behind.
  useEffect(() => {
    aliveRef.current = true;
    const onHide = () => {
      runtimeRef.current?.flush();
      saver.flushNow();
    };
    // Mobile browsers may discard a background tab without firing pagehide: commit
    // what the SCO has set so far. Session time is still recorded once, at the end.
    const onVisibility = () => {
      const rt = runtimeRef.current;
      if (document.visibilityState === "hidden" && rt?.isRunning) rt.commit("");
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      aliveRef.current = false;
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
      runtimeRef.current?.flush();
    };
  }, [saver]);

  /* ---------------- Actions ---------------- */

  /** `p` with the attempts started in this session counted (attemptCount is read once at boot). */
  const withSessionAttempts = (p: ScormPackage): ScormPackage => {
    const started = playRef.current?.attempt ?? 0;
    return started > p.attemptCount ? { ...p, attemptCount: started } : p;
  };

  const actions = {
    /** Open another SCO of the current attempt. */
    pick(sco: ScormSco) {
      if (play && sco.id !== frame?.scoId) launch(sco, play);
    },
    review(attempt: number) {
      if (pkg) start(pkg, attempt, "review", false);
    },
    newAttempt() {
      if (pkg) prepare(withSessionAttempts(pkg), true);
    },
    /**
     * Back in after the SCO left the package. Review restarts the review; anything
     * else goes through the attempt decision again, like re-entering in Moodle: an
     * attempt finished meanwhile opens the "finished" choice (review or new
     * attempt) instead of being replayed with credit.
     */
    reopen() {
      if (!play) return;
      if (play.mode === "review") start(play.pkg, play.attempt, "review", false);
      else prepare(withSessionAttempts(play.pkg), false);
    },
    retry() {
      setError(null);
      setGate({ kind: "loading" });
      setBootKey((k) => k + 1);
    },
  };

  return { pkg, placement, cm, error, gate, play, toc, frame, session, saveState, actions };
}
