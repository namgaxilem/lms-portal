"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, Award, CircleCheck, Eye, EyeOff, History, ListTree, Maximize2, Minimize2 } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useCourseNavigationState } from "@/components/activity/course-navigation";
import { moduleRoute } from "@/lib/moodle/course-outline";
import { Badge, Button, Progress, cn } from "@/components/ui";
import { courseStyle } from "@/lib/course-color";
import { useCourseDetails } from "@/lib/moodle/hooks";
import type { CourseModule, ScormSco } from "@/lib/moodle/types";
import { moodleBase } from "@/lib/public-config";
import { isIncomplete, type TocItem } from "@/lib/scorm/player-data";
import { CourseOutline } from "./CourseOutline";
import { useFullscreen, useViewportFill } from "./layout-hooks";
import { PlayerFooter, type Step } from "./PlayerFooter";
import { PlayerHeader } from "./PlayerHeader";
import { PanelOverlay, PanelSidebar, type PanelTab } from "./PlayerPanel";
import { InfoChip, SaveIndicator, SessionClock } from "./PlayerStatus";
import { PartsList } from "./ScormToc";
import { ScoFrame, StageError, StageLoading, StageMessage } from "./StageViews";
import { completionState, useScormPlayer, type PlayContext } from "./useScormPlayer";
import { useMediaQuery } from "@/lib/browser-hooks";

const PANEL_ID = "scorm-panel";

/** Moodle `hidetoc`: 0 = sidebar, 1 = hidden (toggle), 2 = drop-down, 3 = disabled. */
const TOC_SIDE = 0;
const TOC_DROPDOWN = 2;
const TOC_DISABLED = 3;

/** Icon buttons stay 40px while touch is likely, 36px on desktop. */
const iconButton = "lg:h-9 lg:w-9";

type T = ReturnType<typeof useT>;

/** Single-SCO lesson status: Moodle's status, or "N% learned" from cmi.progress_measure. */
function singleStatus({ status, progress }: TocItem, t: T): { percent: number | null; label: string } {
  const label = t(`scorm.status.${status}`);
  if (status === "completed" || status === "passed") return { percent: 100, label };
  if (progress !== undefined && status !== "failed") {
    const percent = Math.round(progress * 100);
    return { percent, label: t("scorm.learned", { percent }) };
  }
  return { percent: null, label };
}

/** "Attempt n (of max)" when it tells the learner something: limited attempts, or not the first one. */
function attemptLabel(play: PlayContext | null, t: T) {
  if (!play) return null;
  const max = play.pkg.scorm.maxattempt;
  if (max) return t("scorm.attemptOf", { n: play.attempt, max });
  return play.attempt > 1 ? t("scorm.attempt", { n: play.attempt }) : null;
}

/**
 * Native SCORM player in option A's focus mode: a one-row header (course,
 * section, activity, course progress, session facts), a side panel with the
 * package's parts and the course outline, the raw SCO served same-origin by
 * /api/scorm/content, and a bottom bar with the lesson status and prev/next.
 * Tracking goes straight to Moodle via mod_scorm web services, so grades and
 * completion stay Moodle's source of truth.
 */
export function ScormPlayer({ cmid, courseHint }: { cmid: number; courseHint?: number }) {
  const t = useT();
  const { user } = useSession();
  const { pkg, placement, cm, error, gate, play, toc, frame, session, saveState, actions } = useScormPlayer(
    cmid,
    courseHint
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useViewportFill(containerRef);
  const fullscreen = useFullscreen(containerRef);
  const sm = useMediaQuery("(min-width: 640px)");
  const xl = useMediaQuery("(min-width: 1280px)");
  const [sidebarPref, setSidebarPref] = useState<boolean | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [tabPref, setTabPref] = useState<PanelTab>("parts");

  const courseId = placement?.courseId ?? courseHint;
  const { byId } = useCourseDetails(courseId ? [courseId] : []);
  // The shared, cached course contents (outline, prev/next, course progress, section trail).
  const { nav, refresh: refreshContents } = useCourseNavigationState(courseId ?? 0, cmid);

  // Moodle just recorded this activity's completion (complete-on-view, or the SCO
  // finished): read the course contents again so the outline and course progress
  // agree with the completion chip instead of the cached state.
  const completion = completionState(cm);
  const lastCompletion = useRef(completion);
  useEffect(() => {
    if (lastCompletion.current === "pending" && completion === "done") refreshContents();
    lastCompletion.current = completion;
  }, [completion, refreshContents]);

  /* ---------------- Derived ---------------- */

  const playing = gate.kind === "playing";
  const active = playing || gate.kind === "ended";
  const launchable = toc.filter((i) => i.launchable);
  const idx = frame ? launchable.findIndex((i) => i.sco.id === frame.scoId) : -1;
  const current = idx >= 0 ? launchable[idx] : launchable.length === 1 ? launchable[0] : undefined;
  const doneCount = launchable.filter((i) => !isIncomplete(i.status)).length;
  const multi = launchable.length > 1;
  const storedSecs = toc.reduce((sum, i) => sum + i.time, 0);
  const hidetoc = pkg?.scorm.hidetoc ?? TOC_SIDE;
  const backHref = courseId ? `/courses/${courseId}` : undefined;
  const moodleUrl = `${moodleBase()}/mod/scorm/view.php?id=${cmid}`;
  const eyebrow = [courseId ? byId.get(courseId)?.fullname : undefined, ...(nav?.trail ?? [])]
    .filter(Boolean)
    .join(" · ");

  // Side panel: the package's parts (unless Moodle disables its TOC) and the course outline.
  const tabs: PanelTab[] = [];
  if (playing && multi && hidetoc !== TOC_DISABLED) tabs.push("parts");
  if (nav && courseId) tabs.push("course");
  const tab = tabs.includes(tabPref) ? tabPref : tabs[0];
  // Layout and default state follow the package's TOC setting, known as soon as the
  // package is (before the first SCO plays), so the sidebar does not jump at launch.
  const partsToc = !!pkg && hidetoc !== TOC_DISABLED && pkg.scoes.filter((s) => s.launch).length > 1;
  const settled = !!pkg || gate.kind !== "loading" || !!error;
  // A sidebar from xl (unless Moodle wants the parts as a drop-down); else an overlay on the stage.
  const sidebarLayout = xl && !(partsToc && hidetoc === TOC_DROPDOWN);
  const sidebarOpen = sidebarPref ?? (partsToc ? hidetoc === TOC_SIDE : true);
  const showSidebar = settled && tabs.length > 0 && sidebarLayout && sidebarOpen;
  const showOverlay = tabs.length > 0 && !sidebarLayout && overlayOpen;

  // Footer steps: the package's parts while there are any (unless Moodle hides SCO
  // navigation), then the course's activities, then back to the course.
  const partStep = (sco?: ScormSco): Step | null => (sco ? { kind: "part", sco, onPick: actions.pick } : null);
  const activityStep = (mod?: CourseModule | null): Step | null =>
    mod && courseId ? { kind: "activity", name: mod.name, href: moduleRoute(mod, courseId) } : null;
  const partSteps = playing && multi && pkg?.scorm.nav !== 0 && idx >= 0;
  const prevStep = (partSteps && partStep(launchable[idx - 1]?.sco)) || activityStep(nav?.prev);
  const nextStep =
    (partSteps && partStep(launchable[idx + 1]?.sco)) ||
    activityStep(nav?.next) ||
    (nav && nav.index >= 0 && backHref ? ({ kind: "end", href: backHref } as const) : null);

  // A course colour for every course-tinted element; brand primary until the course is known.
  const style: CSSProperties = courseId ? courseStyle(courseId) : { ["--course" as string]: "var(--c-primary)" };

  const togglePanel = () => (sidebarLayout ? setSidebarPref(!showSidebar) : setOverlayOpen((o) => !o));
  const closeOverlay = () => {
    setOverlayOpen(false);
    toggleRef.current?.focus();
  };
  const pickPart: typeof actions.pick = (sco) => {
    if (showOverlay) closeOverlay();
    actions.pick(sco);
  };

  /* ---------------- Pieces ---------------- */

  // Moodle deep links are for the site admin only; everyone else stays in the portal.
  const moodleAction = user.isSiteAdmin ? (
    <Button href={moodleUrl} external variant="secondary">
      {t("common.openExternal")}
      <ArrowUpRight size={16} strokeWidth={2} />
    </Button>
  ) : null;

  const panelOpen = showSidebar || showOverlay;
  const headerActions = (
    <>
      {tabs.length > 0 && (
        <Button
          ref={toggleRef}
          variant={panelOpen ? "primary" : "secondary"}
          size="icon"
          className={cn(iconButton, "xl:w-auto xl:px-3 xl:text-[13px]")}
          onClick={togglePanel}
          aria-expanded={panelOpen}
          aria-controls={panelOpen ? PANEL_ID : undefined}
          aria-label={t("scorm.contents")}
        >
          <ListTree size={16} strokeWidth={2} />
          <span className="hidden xl:inline">{t("scorm.contents")}</span>
        </Button>
      )}
      {user.isSiteAdmin && (
        <Button
          variant="ghost"
          size="icon"
          className={iconButton}
          href={moodleUrl}
          external
          aria-label={t("common.openExternal")}
        >
          <ArrowUpRight size={16} strokeWidth={2} />
        </Button>
      )}
      {fullscreen.supported && (
        <Button
          variant="ghost"
          size="icon"
          className={iconButton}
          onClick={fullscreen.toggle}
          aria-label={fullscreen.active ? t("scorm.exitFullscreen") : t("common.fullscreen")}
        >
          {fullscreen.active ? <Minimize2 size={16} strokeWidth={2} /> : <Maximize2 size={16} strokeWidth={2} />}
        </Button>
      )}
    </>
  );

  // Session facts sit in the header from sm; on phones they shrink into the footer.
  const compact = !sm;
  const modeLabel =
    !active || !play
      ? null
      : play.mode === "review"
        ? t("scorm.review")
        : !play.canSave
          ? t("scorm.preview")
          : null;
  const modeBadge = modeLabel && (
    <Badge tone={play?.mode === "review" ? "warning" : "neutral"} title={modeLabel}>
      {play?.mode === "review" ? (
        <Eye size={13} strokeWidth={2} aria-hidden />
      ) : (
        <EyeOff size={13} strokeWidth={2} aria-hidden />
      )}
      <span className={cn(compact && "sr-only")}>{modeLabel}</span>
    </Badge>
  );
  const clock =
    session && active ? (
      <SessionClock key={session.start} span={session} storedSecs={storedSecs} compact={compact} />
    ) : null;
  const attempt = active ? attemptLabel(play, t) : null;
  const facts =
    sm && (modeBadge || attempt || clock) ? (
      <>
        {modeBadge}
        {attempt && <InfoChip icon={History}>{attempt}</InfoChip>}
        {clock}
      </>
    ) : undefined;

  const score = playing ? current?.score : undefined;
  const chips = (
    <>
      {compact && modeBadge}
      {score !== undefined && (
        <InfoChip icon={Award} compact={compact}>
          <span className={cn(compact && "sr-only")}>{t("scorm.score")}</span> {score}
        </InfoChip>
      )}
      {completion === "done" && (
        <Badge tone="success" title={t("scorm.completionRecorded")}>
          <CircleCheck size={14} strokeWidth={2.2} aria-hidden />
          <span className="max-xl:sr-only">{t("scorm.completionRecorded")}</span>
        </Badge>
      )}
      {compact && clock}
      <SaveIndicator state={saveState} />
    </>
  );

  function renderLesson() {
    if (!active || !current) return null;
    if (multi) {
      return (
        <div className="min-w-0 flex-1 leading-tight">
          {idx >= 0 && (
            <p className="truncate text-2xs font-bold uppercase tracking-wide text-subtle">
              {t("scorm.partOf", { n: idx + 1, total: launchable.length })}
            </p>
          )}
          <p className="mt-0.5 truncate text-[13px] font-bold text-fg">{current.sco.title}</p>
        </div>
      );
    }
    const lesson = singleStatus(current, t);
    return (
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-fg">{lesson.label}</p>
        {lesson.percent !== null && (
          <Progress
            value={lesson.percent}
            tone="course"
            size="sm"
            label={t("scorm.lessonProgress")}
            className="mt-1.5 max-w-md"
          />
        )}
      </div>
    );
  }

  function renderStage() {
    if (error) return <StageError error={error} onRetry={actions.retry} moodleAction={moodleAction} />;
    switch (gate.kind) {
      case "loading":
        return <StageLoading />;
      case "playing":
        return <ScoFrame frame={frame} fallbackTitle={placement?.name || t("scorm.title")} />;
      default:
        return (
          <StageMessage
            gate={gate}
            maxAttempts={pkg?.scorm.maxattempt ?? 0}
            backHref={backHref}
            moodleAction={moodleAction}
            onReview={actions.review}
            onNewAttempt={actions.newAttempt}
            onReopen={actions.reopen}
          />
        );
    }
  }

  const panelProps = {
    id: PANEL_ID,
    tabs,
    tab,
    onTab: setTabPref,
    children:
      tab === "parts" ? (
        <PartsList items={toc} activeId={frame?.scoId} onPick={pickPart} done={doneCount} total={launchable.length} />
      ) : nav && courseId ? (
        <CourseOutline nav={nav} courseId={courseId} cmid={cmid} />
      ) : null,
  };

  /* ---------------- Layout ---------------- */

  return (
    <div
      ref={containerRef}
      style={style}
      className={cn(
        "flex min-h-[480px] flex-col gap-2 sm:gap-3",
        // Fill the viewport (see useViewportFill); the fallback is about the focus shell's padding.
        "h-[calc(100dvh_-_var(--chrome-offset,2rem))]",
        "[&:fullscreen]:h-dvh [&:fullscreen]:bg-canvas [&:fullscreen]:p-3"
      )}
    >
      <PlayerHeader
        courseId={courseId}
        eyebrow={eyebrow || undefined}
        title={placement?.name || t("scorm.title")}
        coursePercent={nav?.progress?.percent ?? null}
        facts={facts}
        actions={headerActions}
      />

      <div className="flex min-h-0 flex-1 gap-3">
        {showSidebar && <PanelSidebar {...panelProps} />}
        {/* Neutral surface whatever the theme: packages assume a light page. */}
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-card border border-line/60 bg-surface shadow-card dark:border-line">
          {/* Always rendered, so the SCO iframe is never re-parented; inert under the overlay. */}
          <div className="absolute inset-0" inert={showOverlay}>
            {renderStage()}
          </div>
          {showOverlay && <PanelOverlay {...panelProps} onClose={closeOverlay} />}
        </div>
      </div>

      {(active || prevStep || nextStep) && (
        <PlayerFooter label={t("scorm.lessonNav")} prev={prevStep} next={nextStep}>
          <div className="flex min-w-0 items-center gap-3">
            {renderLesson() ?? <span className="flex-1" />}
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">{chips}</div>
          </div>
        </PlayerFooter>
      )}
    </div>
  );
}
