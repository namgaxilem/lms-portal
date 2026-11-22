"use client";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  BookOpen,
  CalendarClock,
  CalendarPlus,
  CircleCheck,
  ClipboardCheck,
  Clock,
  Hourglass,
  Lock,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Badge, Button, HeroCard, ProgressRing } from "@/components/ui";
import type { Assignment, SubmissionStatus } from "@/lib/moodle/types";
import { formatDuration } from "@/lib/format";
import { formatWhen, gradeLabel } from "./lib";
import { REMAINING_KEY, remainingTime, type AssignmentState, type Remaining } from "./state";
import { submissionStatusMeta } from "./StatusBadge";

type Panel =
  | { kind: "grade"; grade: string; gradedOn: number }
  | { kind: "submitted"; remaining: Remaining | null; at: number }
  | { kind: "notOpen"; opens: number }
  | { kind: "overdue"; by: number }
  | { kind: "countdown"; left: number; percent: number | null }
  | { kind: "noDue" };

/**
 * What the hero's side panel shows, most important first. Without a submission
 * status (loading or failed) only date-based panels are possible.
 */
function heroPanel(
  a: Assignment,
  s: AssignmentState,
  feedback: SubmissionStatus["feedback"],
  now: number
): Panel | null {
  const grade = s.known ? gradeLabel(feedback?.gradefordisplay) : null;
  if (grade) return { kind: "grade", grade, gradedOn: feedback?.gradeddate ?? 0 };
  if (s.acceptsSubmissions) {
    if (s.known && s.submitted) return { kind: "submitted", remaining: remainingTime(s, now), at: s.sub?.timemodified ?? 0 };
    if (s.notOpen) return { kind: "notOpen", opens: a.allowsubmissionsfromdate };
    if (s.overdue) return { kind: "overdue", by: now - s.due };
  }
  if (s.due > now) {
    const start = a.allowsubmissionsfromdate;
    // A ring needs a real window: submissions open → due date.
    const percent = start > 0 && start < s.due ? ((s.due - now) / (s.due - start)) * 100 : null;
    return { kind: "countdown", left: s.due - now, percent };
  }
  return s.acceptsSubmissions && !s.due ? { kind: "noDue" } : null;
}

/** Status chip on the course gradient: a dark tint keeps white text readable on light course colours. */
function HeroChip({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex h-7 max-w-full items-center gap-1.5 whitespace-nowrap rounded-full bg-black/20 px-3 text-xs font-bold text-white backdrop-blur-sm">
      <Icon size={14} strokeWidth={2.2} className="shrink-0" aria-hidden />
      <span className="truncate">{children}</span>
    </span>
  );
}

function PanelIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span aria-hidden className="grid h-20 w-20 place-items-center rounded-full bg-white/20 ring-8 ring-white/10">
      <Icon size={34} strokeWidth={2} />
    </span>
  );
}

const panelClass =
  "flex shrink-0 flex-col items-center gap-3 rounded-3xl bg-black/15 p-5 text-center ring-1 ring-white/20 backdrop-blur md:w-64";

/** Placeholder while the submission status loads (CourseHero does the same for progress). */
function PanelSkeleton() {
  return (
    <div aria-hidden className={panelClass}>
      <span className="h-20 w-20 animate-pulse rounded-full bg-white/20" />
      <span className="h-4 w-32 animate-pulse rounded-full bg-white/20" />
    </div>
  );
}

/** Glass side panel: grade, countdown ring or the current state. */
function HeroPanel({ panel, a, s }: { panel: Panel; a: Assignment; s: AssignmentState }) {
  const t = useT();
  const { locale } = useLocale();

  let visual: ReactNode;
  let title: ReactNode;
  let sub: ReactNode = null;
  switch (panel.kind) {
    case "grade":
      visual = <PanelIcon icon={Award} />;
      title = (
        <>
          <span className="block text-xs font-semibold">{t("assignment.feedback.grade")}</span>
          <span className="block text-3xl font-extrabold tabular-nums">{panel.grade}</span>
        </>
      );
      sub = panel.gradedOn ? t("assignment.feedback.gradedOn", { date: formatWhen(panel.gradedOn, locale) }) : null;
      break;
    case "submitted":
      visual = <PanelIcon icon={CircleCheck} />;
      title = t("assignment.status.submitted");
      sub = panel.remaining
        ? t(REMAINING_KEY[panel.remaining.kind], { time: formatDuration(panel.remaining.seconds, t) })
        : panel.at
          ? formatWhen(panel.at, locale)
          : null;
      break;
    case "notOpen":
      visual = <PanelIcon icon={Lock} />;
      title = t("assignment.hero.opensOn");
      sub = formatWhen(panel.opens, locale);
      break;
    case "overdue":
      visual = <PanelIcon icon={TriangleAlert} />;
      title = t("assignment.time.overdue", { time: formatDuration(panel.by, t) });
      sub = s.closed ? t("assignment.hero.closed") : s.canEdit ? t("assignment.hero.lateAllowed") : null;
      break;
    case "countdown": {
      const center = (
        <span className="px-3 text-center leading-tight">
          <span className="block text-lg font-extrabold tabular-nums">{formatDuration(panel.left, t)}</span>
          <span className="block text-xs font-semibold">{t("assignment.hero.left")}</span>
        </span>
      );
      visual =
        panel.percent === null ? (
          <span className="grid h-28 w-28 place-items-center rounded-full bg-white/20 ring-8 ring-white/10">
            {center}
          </span>
        ) : (
          <ProgressRing value={panel.percent} size={112} stroke={10} tone="white" label={t("assignment.hero.ringLabel")}>
            {center}
          </ProgressRing>
        );
      title = t("assignment.hero.dueOn", { date: formatWhen(s.due, locale) });
      break;
    }
    case "noDue":
      visual = <PanelIcon icon={Hourglass} />;
      title = t("assignment.noDue");
      sub = a.allowsubmissionsfromdate ? t("assignment.hero.openSince", { date: formatWhen(a.allowsubmissionsfromdate, locale) }) : null;
      break;
  }

  return (
    <div className={panelClass}>
      {visual}
      <div className="text-sm font-bold">{title}</div>
      {sub && <p className="-mt-2 text-xs font-medium">{sub}</p>}
    </div>
  );
}

/** The state chips that apply right now (none until the submission status is known). */
function statusChips(s: AssignmentState, t: ReturnType<typeof useT>) {
  if (!s.known) return [];
  const statusMeta = submissionStatusMeta(s.subStatus);
  const chips: { key: string; node: ReactNode }[] = [];
  if (s.acceptsSubmissions) chips.push({ key: "status", node: <HeroChip icon={statusMeta.icon}>{t(statusMeta.key)}</HeroChip> });
  if (s.graded) chips.push({ key: "graded", node: <HeroChip icon={Award}>{t("assignment.status.graded")}</HeroChip> });
  if (s.acceptsSubmissions && s.overdue) {
    chips.push({
      key: "overdue",
      node: (
        <Badge tone="danger" solid>
          <TriangleAlert size={14} strokeWidth={2.2} aria-hidden />
          {t("assignment.badge.overdue")}
        </Badge>
      ),
    });
  }
  if (s.late) chips.push({ key: "late", node: <HeroChip icon={Clock}>{t("assignment.badge.late")}</HeroChip> });
  if (s.extension > 0) chips.push({ key: "extension", node: <HeroChip icon={CalendarPlus}>{t("assignment.badge.extension")}</HeroChip> });
  if (s.locked) chips.push({ key: "locked", node: <HeroChip icon={Lock}>{t("assignment.badge.locked")}</HeroChip> });
  return chips;
}

/** Course-coloured status header: name, state chips, key dates and the countdown or grade. */
export function AssignmentHero({
  assignment: a,
  courseShortname,
  state: s,
  status,
  statusLoading,
  now,
}: {
  assignment: Assignment;
  courseShortname?: string;
  state: AssignmentState;
  status: SubmissionStatus | null;
  /** get_submission_status is still loading (show placeholders, no state claims). */
  statusLoading: boolean;
  now: number;
}) {
  const t = useT();
  const { locale } = useLocale();
  const pending = statusLoading && !s.known;
  const panel = pending ? null : heroPanel(a, s, status?.feedback, now);
  const chips = statusChips(s, t);
  const toGrade = status?.gradingsummary?.submissionsneedgradingcount ?? 0;
  // The countdown / "no due date" panel already shows the due date.
  const showDue = panel?.kind !== "countdown" && panel?.kind !== "noDue";

  return (
    <HeroCard course className="animate-fade-in-up">
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <HeroChip icon={ClipboardCheck}>{t("modules.assign")}</HeroChip>
            {courseShortname && <HeroChip icon={BookOpen}>{courseShortname}</HeroChip>}
          </div>
          <h1 className="mt-3 break-words text-2xl font-extrabold tracking-tight sm:text-3xl">{a.name}</h1>

          {pending ? (
            <div aria-hidden className="mt-4 flex gap-2">
              <span className="h-7 w-28 animate-pulse rounded-full bg-white/20" />
              <span className="h-7 w-20 animate-pulse rounded-full bg-white/20" />
            </div>
          ) : (
            chips.length > 0 && (
              <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label={t("grading.statusLabel")}>
                {chips.map((c) => (
                  <li key={c.key}>{c.node}</li>
                ))}
              </ul>
            )
          )}

          {(showDue || s.timelimit > 0) && (
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium">
              {showDue && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock size={16} strokeWidth={2} aria-hidden />
                  {s.due ? t("assignment.hero.dueOn", { date: formatWhen(s.due, locale) }) : t("assignment.noDue")}
                </span>
              )}
              {s.timelimit > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Timer size={16} strokeWidth={2} aria-hidden />
                  {t("assignment.hero.timeLimit", { time: formatDuration(s.timelimit, t) })}
                </span>
              )}
            </div>
          )}

          {status?.gradingsummary && (
            <Button variant="light" href={`/teacher/grading/${a.cmid}`} className="mt-5">
              <ClipboardCheck size={16} strokeWidth={2} />
              {t("assignment.openGrading")}
              {toGrade > 0 && (
                <Badge tone="danger" solid>
                  {t("grading.needsGradingCount", { n: toGrade })}
                </Badge>
              )}
            </Button>
          )}
        </div>

        {pending ? <PanelSkeleton /> : panel && <HeroPanel panel={panel} a={a} s={s} />}
      </div>
    </HeroCard>
  );
}
