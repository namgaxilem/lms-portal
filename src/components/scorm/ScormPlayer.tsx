"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { Drawer } from "antd";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheck,
  CircleDot,
  CircleX,
  Clock,
  Eye,
  ListTree,
  LoaderCircle,
  Lock,
  Maximize2,
  PackageX,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { Badge, Button, EmptyState, Progress, QueryState, Skeleton, cn } from "@/components/ui";
import { moodleClient } from "@/lib/client-api";
import { MOODLE_BASE } from "@/lib/public-config";
import type { ScormSco } from "@/lib/moodle/types";
import { ScormRuntime, createScormApi, type NavRequest, type ScormMode } from "@/lib/scorm/runtime";
import {
  attemptIncomplete,
  buildToc,
  createTrackSaver,
  decideAttempt,
  firstSco,
  isIncomplete,
  loadAttemptData,
  loadPackage,
  scoUrl,
  ScormWindowError,
  type AttemptData,
  type SaveState,
  type ScormPackage,
  type TocItem,
} from "@/lib/scorm/player-data";

/** What is being played right now; kept in a ref for callbacks fired by the SCO. */
interface PlayContext {
  pkg: ScormPackage;
  attempt: number;
  mode: ScormMode;
  canSave: boolean;
}

type Gate =
  | { kind: "loading" }
  | { kind: "playing" }
  | { kind: "done"; attempt: number; canNew: boolean }
  | { kind: "locked" }
  | { kind: "notopen"; at: number }
  | { kind: "closed"; at: number }
  | { kind: "nosco" }
  | { kind: "unsupported" };

function formatClock(secs: number) {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Slide-based packages (iSpring, Articulate…) scale a fixed stage and paint the
 * rest of the page a solid gray. Make that page transparent so the stage sits
 * on our own surface. Packages with a white/transparent page (plain HTML
 * lessons) are left alone. Returns true when the letterbox was replaced.
 */
function blendLetterbox(frame: HTMLIFrameElement): boolean {
  try {
    const doc = frame.contentDocument;
    if (!doc?.body) return false;
    const [r, g, b, a = 1] = (getComputedStyle(doc.body).backgroundColor.match(/[\d.]+/g) ?? []).map(Number);
    if (r === undefined || a === 0 || (r >= 245 && g >= 245 && b >= 245)) return false;
    for (const el of [doc.documentElement, doc.body]) {
      el.style.setProperty("background", "transparent", "important");
    }
    return true;
  } catch {
    // Cross-origin (absolute launch URL): nothing to adjust.
    return false;
  }
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
  return item;
}

const STATUS_ICON: Record<string, { icon: LucideIcon; className: string }> = {
  completed: { icon: CircleCheck, className: "text-success" },
  passed: { icon: CircleCheck, className: "text-success" },
  failed: { icon: CircleX, className: "text-error" },
  incomplete: { icon: CircleDot, className: "text-primary-text" },
  browsed: { icon: CircleDot, className: "text-muted" },
  notattempted: { icon: Circle, className: "text-line-strong" },
};

function StatusIcon({ status, label }: { status: string; label: string }) {
  const { icon: Icon, className } = STATUS_ICON[status] ?? STATUS_ICON.notattempted;
  return <Icon size={16} strokeWidth={1.75} className={cn("shrink-0", className)} aria-label={label} />;
}

function TocList({
  items,
  activeId,
  onPick,
}: {
  items: TocItem[];
  activeId?: number;
  onPick: (sco: ScormSco) => void;
}) {
  const t = useT();
  return (
    <ul className="space-y-0.5 p-2">
      {items.map((item) => {
        const indent = { paddingLeft: 10 + item.level * 14 };
        if (!item.launchable) {
          return (
            <li
              key={item.sco.id}
              style={indent}
              className="px-2.5 pb-1 pt-3 text-xs font-medium text-subtle first:pt-1"
            >
              {item.sco.title}
            </li>
          );
        }
        const active = item.sco.id === activeId;
        return (
          <li key={item.sco.id}>
            <button
              type="button"
              style={indent}
              onClick={() => onPick(item.sco)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg py-2 pr-2.5 text-left text-[13px] transition-colors",
                active
                  ? "bg-primary-soft font-medium text-primary-text"
                  : "text-fg hover:bg-surface-2"
              )}
            >
              <StatusIcon status={item.status} label={t(`scorm.status.${item.status}`)} />
              <span className="min-w-0 flex-1 truncate">{item.sco.title}</span>
              {item.score !== undefined && (
                <span className="shrink-0 text-xs tabular-nums text-subtle">{item.score}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const t = useT();
  if (state === "idle") return null;
  const map = {
    saving: { icon: LoaderCircle, text: t("scorm.saving"), cls: "text-subtle", spin: true },
    saved: { icon: CircleCheck, text: t("scorm.saved"), cls: "text-subtle", spin: false },
    error: { icon: TriangleAlert, text: t("scorm.saveError"), cls: "text-warning", spin: false },
  }[state];
  const Icon = map.icon;
  return (
    <span className={cn("hidden items-center gap-1.5 text-xs sm:inline-flex", map.cls)} role="status">
      <Icon size={14} strokeWidth={1.75} className={cn(map.spin && "animate-spin")} />
      {map.text}
    </span>
  );
}

/**
 * Native SCORM player: our own chrome (TOC, navigation, timer, attempt handling)
 * around the raw SCO served same-origin by /api/scorm/content. Tracking goes
 * straight to Moodle via mod_scorm web services, so grades and completion stay
 * Moodle's source of truth.
 */
export function ScormPlayer({ cmid, courseHint }: { cmid: number; courseHint?: number }) {
  const t = useT();
  const { locale } = useLocale();
  const { user } = useSession();
  const router = useRouter();

  const [pkg, setPkg] = useState<ScormPackage | null>(null);
  const [activityName, setActivityName] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<Gate>({ kind: "loading" });
  const [play, setPlay] = useState<PlayContext | null>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [frame, setFrame] = useState<{ scoId: number; title: string; src: string; key: number } | null>(null);
  const [frameLoading, setFrameLoading] = useState(false);
  const [stage, setStage] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saver] = useState(() => createTrackSaver(setSaveState));
  const [sidebar, setSidebar] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);

  const runtimeRef = useRef<ScormRuntime | null>(null);
  const playRef = useRef<PlayContext | null>(null);
  const orderRef = useRef<ScormSco[]>([]);
  const switchingRef = useRef(false);
  const aliveRef = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const onFinishRef = useRef<(scoId: number, nav: NavRequest) => void>(() => {});

  const moodleUrl = `${MOODLE_BASE}/mod/scorm/view.php?id=${cmid}`;

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
  }, [saver, user.id]);

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
          if (!entry.tracked["x.start.time"]) {
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

        moodleClient("mod_scorm_launch_sco", { scormid: ctx.pkg.scorm.id, scoid: sco.id }).catch(() => {});
        setStartedAt(Date.now());
        setNow(Date.now());
        setFrameLoading(true);
        setFrame({ scoId: sco.id, title: sco.title, src: scoUrl(ctx.pkg, sco), key: Date.now() });
      } catch (e) {
        if (aliveRef.current) setError((e as Error).message);
      } finally {
        switchingRef.current = false;
      }
    },
    [saver, user.id]
  );

  /** SCO called LMSFinish/Terminate: follow its navigation request (or `auto`). */
  useEffect(() => {
    onFinishRef.current = (scoId, nav) => {
      const ctx = playRef.current;
      if (switchingRef.current || !aliveRef.current || !ctx) return;
      const order = orderRef.current;
      const idx = order.findIndex((s) => s.id === scoId);
      const target =
        nav === "previous"
          ? order[idx - 1]
          : nav === "continue" || ctx.pkg.scorm.auto
            ? order[idx + 1]
            : undefined;
      // We are inside the SCO's own API call; leave its frame alone until it returns.
      setTimeout(() => (target ? launch(target, ctx) : refreshToc()), 0);
    };
  }, [launch, refreshToc]);

  const start = useCallback(
    async (p: ScormPackage, attempt: number, mode: ScormMode, isNew: boolean) => {
      setGate({ kind: "loading" });
      const canSave = p.access.cansavetrack !== false && mode === "normal";
      const data = await loadAttemptData(p, user.id, attempt);
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
    },
    [launch, user.id]
  );

  /** Pick attempt + mode like Moodle's scorm_check_mode, then start or ask. */
  const prepare = useCallback(
    async (p: ScormPackage, wantNew: boolean) => {
      const canSave = p.access.cansavetrack !== false;
      const last = p.scorm.maxattempt ? Math.min(p.attemptCount, p.scorm.maxattempt) : p.attemptCount;
      let lastIncomplete = true;
      if (last > 0) {
        const lastData = await loadAttemptData(p, user.id, last);
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
      await start(p, d.attempt, d.mode, d.isNew);
    },
    [start, user.id]
  );

  /* ---------------- Boot ---------------- */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await loadPackage(cmid, user.id, courseHint);
        if (cancelled) return;
        setPkg(p);
        moodleClient("mod_scorm_view_scorm", { scormid: p.scorm.id }).catch(() => {});

        if (p.scorm.version && !/^SCORM_1\.[23]$/.test(p.scorm.version)) {
          setGate({ kind: "unsupported" });
        } else {
          await prepare(p, false);
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ScormWindowError) {
          setActivityName(e.activityName);
          setGate({ kind: e.kind, at: e.at });
        } else {
          setError((e as Error).message);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cmid, courseHint, user.id, prepare]);

  // Expose the SCORM API where the SCO looks for it (parent window).
  useEffect(() => {
    if (!pkg) return;
    const w = window as unknown as Record<string, unknown>;
    const name = pkg.version === "2004" ? "API_1484_11" : "API";
    w[name] = createScormApi(pkg.version, () => runtimeRef.current);
    return () => {
      delete w[name];
    };
  }, [pkg]);

  // Save on tab close / navigation away. Removing the iframe (unmount) lets the SCO
  // run its own unload → LMSFinish first; flush() only catches what it left behind.
  useEffect(() => {
    aliveRef.current = true;
    const onHide = () => {
      runtimeRef.current?.flush();
      saver.flushNow();
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      aliveRef.current = false;
      window.removeEventListener("pagehide", onHide);
      runtimeRef.current?.flush();
    };
  }, [saver]);

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  /* ---------------- Derived ---------------- */

  const launchable = toc.filter((i) => i.launchable);
  const idx = frame ? launchable.findIndex((i) => i.sco.id === frame.scoId) : -1;
  const prev = idx > 0 ? launchable[idx - 1] : undefined;
  const next = idx >= 0 ? launchable[idx + 1] : undefined;
  const doneCount = launchable.filter((i) => !isIncomplete(i.status)).length;
  const multi = launchable.length > 1;
  const showToc = multi && pkg?.scorm.hidetoc !== 3;
  const sessionSecs = startedAt ? (now - startedAt) / 1000 : 0;
  const totalSecs = toc.reduce((sum, i) => sum + i.time, 0) + sessionSecs;
  const fmtDate = (unix: number) =>
    new Date(unix * 1000).toLocaleString(locale === "vi" ? "vi-VN" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const pick = (sco: ScormSco) => {
    setDrawer(false);
    if (play && sco.id !== frame?.scoId) launch(sco, play);
  };

  const toggleToc = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) setSidebar((s) => !s);
    else setDrawer(true);
  };

  const attemptLabel = play
    ? play.pkg.scorm.maxattempt
      ? t("scorm.attemptOf", { n: play.attempt, max: play.pkg.scorm.maxattempt })
      : t("scorm.attempt", { n: play.attempt })
    : null;

  /* ---------------- Render ---------------- */

  // Moodle deep links are for the site admin only; everyone else stays in the portal.
  const moodleAction = user.isSiteAdmin ? (
    <Button href={moodleUrl} external variant="secondary" size="sm">
      {t("common.openExternal")}
      <ArrowUpRight size={14} strokeWidth={1.75} />
    </Button>
  ) : null;

  function renderStage() {
    if (error) {
      return (
        <div className="space-y-4 p-6">
          <QueryState loading={false} error={error}>
            {null}
          </QueryState>
          {moodleAction}
        </div>
      );
    }
    switch (gate.kind) {
      case "loading":
        return <Skeleton className="h-full w-full rounded-none" />;
      case "done":
        return (
          <EmptyState
            icon={CircleCheck}
            title={t("scorm.doneTitle", { n: gate.attempt })}
            hint={t(gate.canNew ? "scorm.doneHint" : "scorm.doneHintReviewOnly")}
            className="h-full"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="secondary" onClick={() => pkg && start(pkg, gate.attempt, "review", false)}>
                  <Eye size={16} strokeWidth={1.75} />
                  {t("scorm.reviewAttempt")}
                </Button>
                {gate.canNew && (
                  <Button onClick={() => pkg && prepare(pkg, true)}>
                    <RotateCcw size={16} strokeWidth={1.75} />
                    {t("scorm.newAttempt")}
                  </Button>
                )}
              </div>
            }
          />
        );
      case "locked":
        return (
          <EmptyState
            icon={Lock}
            title={t("scorm.lockedTitle")}
            hint={t("scorm.lockedHint", { max: pkg?.scorm.maxattempt ?? 0 })}
            className="h-full"
          />
        );
      case "notopen":
        return (
          <EmptyState
            icon={CalendarClock}
            title={t("scorm.notOpenTitle")}
            hint={t("scorm.notOpenHint", { date: fmtDate(gate.at) })}
            className="h-full"
          />
        );
      case "closed":
        return (
          <EmptyState
            icon={CalendarClock}
            title={t("scorm.closedTitle")}
            hint={t("scorm.closedHint", { date: fmtDate(gate.at) })}
            className="h-full"
          />
        );
      case "nosco":
      case "unsupported":
        return (
          <EmptyState
            icon={PackageX}
            title={gate.kind === "nosco" ? t("scorm.noSco") : t("scorm.unsupported")}
            className="h-full"
            action={moodleAction}
          />
        );
      case "playing":
        return (
          <>
            {frame && (
              <iframe
                key={frame.key}
                src={frame.src}
                title={frame.title || t("scorm.title")}
                onLoad={(e) => {
                  setStage(blendLetterbox(e.currentTarget));
                  setFrameLoading(false);
                }}
                className={cn(
                  // Match the SCO's (light) color-scheme, otherwise the browser
                  // paints an opaque white backdrop behind a transparent page.
                  "absolute inset-0 h-full w-full border-0 [color-scheme:light]",
                  stage ? "bg-surface-2" : "bg-white"
                )}
                allow="fullscreen; autoplay; microphone; camera; clipboard-write"
              />
            )}
            {(frameLoading || !frame) && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface">
                <LoaderCircle size={24} strokeWidth={1.75} className="animate-spin text-subtle" />
              </div>
            )}
          </>
        );
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex h-[calc(100dvh-10.5rem)] min-h-[480px] flex-col gap-3 md:h-[calc(100dvh-6.5rem)] [&:fullscreen]:h-dvh [&:fullscreen]:bg-canvas [&:fullscreen]:p-3"
    >
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()} aria-label={t("scorm.back")}>
          <ArrowLeft size={16} strokeWidth={1.75} />
        </Button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-fg">{pkg?.scorm.name ?? activityName ?? t("scorm.title")}</h1>
          <div className="flex min-w-0 items-center gap-2 text-xs text-subtle">
            {frame && multi && <span className="truncate">{frame.title}</span>}
            {attemptLabel && <span className="hidden shrink-0 sm:inline">{attemptLabel}</span>}
            {play?.mode === "review" && <Badge tone="warning">{t("scorm.review")}</Badge>}
            {play && play.mode === "normal" && !play.canSave && (
              <Badge tone="neutral">{t("scorm.preview")}</Badge>
            )}
          </div>
        </div>

        <SaveIndicator state={saveState} />
        {gate.kind === "playing" && startedAt > 0 && (
          <span
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-xs tabular-nums text-muted"
            title={`${t("scorm.totalTime")}: ${formatClock(totalSecs)}`}
            aria-label={t("scorm.session")}
          >
            <Clock size={13} strokeWidth={1.75} />
            {formatClock(sessionSecs)}
          </span>
        )}
        {showToc && gate.kind === "playing" && (
          <Button variant="secondary" size="icon-sm" onClick={toggleToc} aria-label={t("scorm.contents")}>
            <ListTree size={16} strokeWidth={1.75} />
          </Button>
        )}
        {user.isSiteAdmin && (
          <Button variant="ghost" size="icon-sm" href={moodleUrl} external aria-label={t("common.openExternal")}>
            <ArrowUpRight size={16} strokeWidth={1.75} />
          </Button>
        )}
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={() => containerRef.current?.requestFullscreen?.()}
          aria-label={t("common.fullscreen")}
        >
          <Maximize2 size={15} strokeWidth={1.75} />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 gap-3">
        {showToc && sidebar && gate.kind === "playing" && (
          <aside className="hidden w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-line bg-surface lg:flex">
            <div className="border-b border-line px-4 py-3">
              <p className="text-sm font-semibold text-fg">{t("scorm.contents")}</p>
              <p className="mt-0.5 text-xs text-subtle">
                {t("scorm.progress", { done: doneCount, total: launchable.length })}
              </p>
              <Progress value={(doneCount / launchable.length) * 100} tone="success" className="mt-2" />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <TocList items={toc} activeId={frame?.scoId} onPick={pick} />
            </div>
          </aside>
        )}

        <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-line bg-surface">
          {renderStage()}
        </div>
      </div>

      {multi && gate.kind === "playing" && (
        <footer className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={!prev}
            onClick={() => prev && pick(prev.sco)}
            aria-label={t("scorm.prev")}
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
            <span className="hidden sm:inline">{t("scorm.prev")}</span>
          </Button>
          <div className="min-w-0 flex-1">
            <Progress value={(doneCount / launchable.length) * 100} tone="success" />
            <p className="mt-1 text-center text-xs text-subtle">
              {idx + 1} / {launchable.length}
              <span className="hidden sm:inline">
                {" · "}
                {t("scorm.progress", { done: doneCount, total: launchable.length })}
              </span>
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={!next}
            onClick={() => next && pick(next.sco)}
            aria-label={t("scorm.next")}
          >
            <span className="hidden sm:inline">{t("scorm.next")}</span>
            <ChevronRight size={16} strokeWidth={1.75} />
          </Button>
        </footer>
      )}

      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        placement="left"
        size={300}
        title={t("scorm.contents")}
        styles={{ body: { padding: 0 } }}
        className="lg:hidden"
      >
        <TocList items={toc} activeId={frame?.scoId} onPick={pick} />
      </Drawer>
    </div>
  );
}
