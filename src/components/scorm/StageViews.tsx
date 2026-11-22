"use client";
import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CircleCheck,
  DoorOpen,
  Eye,
  LoaderCircle,
  Lock,
  PackageX,
  RotateCcw,
  SearchX,
} from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Button, EmptyState, QueryState, Skeleton, cn } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { Gate, ScoFrameInfo } from "./useScormPlayer";

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

/**
 * The SCO itself. Only the player's launch() may replace `frame`: removing the
 * iframe fires the SCO's unload → LMSFinish while its runtime is still
 * installed. Never re-key, move or conditionally re-mount it for layout.
 */
export function ScoFrame({ frame, fallbackTitle }: { frame: ScoFrameInfo | null; fallbackTitle: string }) {
  const t = useT();
  // Per launch (frame.key): has it loaded, and was its letterbox blended?
  const [loaded, setLoaded] = useState<{ key: number; blended: boolean } | null>(null);
  const ready = !!frame && loaded?.key === frame.key;
  return (
    <>
      {frame && (
        <iframe
          key={frame.key}
          src={frame.src}
          title={frame.title || fallbackTitle}
          onLoad={(e) => setLoaded({ key: frame.key, blended: blendLetterbox(e.currentTarget) })}
          className={cn(
            // Match the SCO's (light) color-scheme, otherwise the browser
            // paints an opaque white backdrop behind a transparent page.
            "absolute inset-0 h-full w-full border-0 [color-scheme:light]",
            ready && loaded?.blended ? "bg-surface-2" : "bg-white"
          )}
          allow="fullscreen; autoplay; microphone; camera; clipboard-write"
        />
      )}
      {!ready && (
        <div role="status" className="absolute inset-0 grid place-items-center bg-surface">
          <LoaderCircle size={28} strokeWidth={2} aria-hidden className="animate-spin text-course" />
          <span className="sr-only">{t("common.loading")}</span>
        </div>
      )}
    </>
  );
}

export function StageLoading() {
  const t = useT();
  return (
    <div role="status" aria-busy="true" className="h-full">
      <span className="sr-only">{t("common.loading")}</span>
      <Skeleton className="h-full w-full rounded-none" />
    </div>
  );
}

export function StageError({
  error,
  onRetry,
  moodleAction,
}: {
  error: string;
  onRetry: () => void;
  moodleAction: ReactNode;
}) {
  const t = useT();
  return (
    <div className="mx-auto flex h-full max-w-lg flex-col justify-center gap-4 p-6">
      <QueryState loading={false} error={error}>
        {null}
      </QueryState>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onRetry}>
          <RotateCcw size={16} strokeWidth={2} />
          {t("common.retry")}
        </Button>
        {moodleAction}
      </div>
    </div>
  );
}

function ActionRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-center gap-2">{children}</div>;
}

type MessageGate = Exclude<Gate, { kind: "loading" } | { kind: "playing" }>;

const PACKAGE_PROBLEM = {
  nosco: "scorm.noSco",
  unsupported: "scorm.unsupported",
  nocontext: "scorm.noContext",
} as const;

/** Everything the stage shows instead of a SCO: finished, locked, closed… */
export function StageMessage({
  gate,
  maxAttempts,
  backHref,
  moodleAction,
  onReview,
  onNewAttempt,
  onReopen,
}: {
  gate: MessageGate;
  maxAttempts: number;
  backHref?: string;
  moodleAction: ReactNode;
  onReview: (attempt: number) => void;
  onNewAttempt: () => void;
  onReopen: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const back = backHref ? (
    <Button href={backHref} variant="secondary">
      <ArrowLeft size={16} strokeWidth={2} />
      {t("activity.backToCourse")}
    </Button>
  ) : null;

  switch (gate.kind) {
    case "ended":
      return (
        <EmptyState
          icon={DoorOpen}
          title={t("scorm.endedTitle")}
          hint={t("scorm.endedHint")}
          className="h-full"
          action={
            <ActionRow>
              <Button variant="gradient" onClick={onReopen}>
                <RotateCcw size={16} strokeWidth={2} />
                {t("scorm.reopen")}
              </Button>
              {back}
            </ActionRow>
          }
        />
      );
    case "done":
      return (
        <EmptyState
          icon={CircleCheck}
          title={t("scorm.doneTitle", { n: gate.attempt })}
          hint={t(gate.canNew ? "scorm.doneHint" : "scorm.doneHintReviewOnly")}
          className="h-full"
          action={
            <ActionRow>
              <Button variant="secondary" onClick={() => onReview(gate.attempt)}>
                <Eye size={16} strokeWidth={2} />
                {t("scorm.reviewAttempt")}
              </Button>
              {gate.canNew && (
                <Button variant="gradient" onClick={onNewAttempt}>
                  <RotateCcw size={16} strokeWidth={2} />
                  {t("scorm.newAttempt")}
                </Button>
              )}
            </ActionRow>
          }
        />
      );
    case "locked":
      return (
        <EmptyState
          icon={Lock}
          title={t("scorm.lockedTitle")}
          hint={t("scorm.lockedHint", { max: maxAttempts })}
          className="h-full"
          action={back}
        />
      );
    case "notopen":
    case "closed": {
      const date = formatDateTime(gate.at, locale);
      const open = gate.kind === "notopen";
      return (
        <EmptyState
          icon={CalendarClock}
          title={t(open ? "scorm.notOpenTitle" : "scorm.closedTitle")}
          hint={date ? t(open ? "scorm.notOpenHint" : "scorm.closedHint", { date }) : undefined}
          className="h-full"
          action={back}
        />
      );
    }
    case "notfound":
      return (
        <EmptyState
          icon={SearchX}
          title={t("activity.notFound")}
          hint={t("activity.notFoundHint")}
          className="h-full"
          action={back}
        />
      );
    case "nosco":
    case "unsupported":
    case "nocontext":
      return (
        <EmptyState
          icon={PackageX}
          title={t(PACKAGE_PROBLEM[gate.kind])}
          className="h-full"
          action={moodleAction}
        />
      );
  }
}
