"use client";
import { useMemo, useState } from "react";
import { Activity, ExternalLink, GraduationCap, UserX, Users } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Button, ProgressRing, QueryState, StatCard } from "@/components/ui";
import { moodleBase } from "@/lib/public-config";
import type { EnrolledUser } from "@/lib/moodle/types";
import { formatNumber } from "@/lib/format";
import { CourseBand } from "./CourseBand";
import { MAX_DETAIL_LEARNERS, useClassTotals, useLearnerProgress, useParticipants, useReportCourse } from "./hooks";
import { ParticipantsTable } from "./ParticipantsTable";
import { ListSkeleton, StatsSkeleton } from "./ReportSkeleton";
import type { LearnerCompletion } from "./types";

const WEEK = 7 * 86_400;

interface ClassSummary {
  students: number;
  staff: number;
  /** null when Moodle hides last access for every learner. */
  activeWeek: number | null;
  neverOpened: number | null;
  /** Mean completion of tracked learners; null until every learner has loaded. */
  average: number | null;
  finished: number;
}

function summarise(
  participants: EnrolledUser[],
  learners: Set<number>,
  progress: Map<number, LearnerCompletion>,
  progressComplete: boolean,
  now: number
): ClassSummary {
  const students = participants.filter((u) => learners.has(u.id));
  // With no learners the counts are simply 0, not hidden.
  const accessKnown = students.length === 0 || students.some((u) => u.lastcourseaccess !== undefined);
  const tracked = students.flatMap((u) => {
    const r = progress.get(u.id);
    return r?.status === "tracked" ? [r.progress] : [];
  });
  return {
    students: students.length,
    staff: participants.length - students.length,
    activeWeek: accessKnown ? students.filter((u) => (u.lastcourseaccess ?? 0) >= now - WEEK).length : null,
    neverOpened: accessKnown ? students.filter((u) => u.lastcourseaccess === 0).length : null,
    average:
      progressComplete && tracked.length ? tracked.reduce((sum, p) => sum + p.percent, 0) / tracked.length : null,
    finished: tracked.filter((p) => p.done === p.total).length,
  };
}

/**
 * Teacher / manager view of one course: class progress (derived from activity
 * completion), participation stats and the participants table. Mount with
 * `key={courseid}` so a slow response never lands under another course.
 */
export function StaffReport({ courseid, learnerIds }: { courseid: number; learnerIds: number[] }) {
  const t = useT();
  const { locale } = useLocale();
  const { user } = useSession();
  const [now] = useState(() => Math.floor(Date.now() / 1000));

  const { course, loading: courseLoading } = useReportCourse(courseid);
  const { participants, loading, error } = useParticipants(courseid);
  const learners = useMemo(() => new Set(learnerIds), [learnerIds]);
  const detailed = learnerIds.length > 0 && learnerIds.length <= MAX_DETAIL_LEARNERS;
  const { results: progress, complete } = useLearnerProgress(courseid, detailed ? learnerIds : []);
  const { totals } = useClassTotals(courseid, detailed);

  const summary = useMemo(
    () => summarise(participants, learners, progress, complete, now),
    [participants, learners, progress, complete, now]
  );
  const average = summary.average !== null ? formatNumber(summary.average, locale, 0) : null;

  // Only site admins are sent to the Moodle website, and only when its URL is configured.
  const graderUrl = user.isSiteAdmin && moodleBase() ? `${moodleBase()}/grade/report/grader/index.php?id=${courseid}` : null;

  const ring =
    average !== null ? (
      <div className="flex items-center gap-3 sm:flex-col sm:gap-1.5 sm:text-center">
        <ProgressRing value={summary.average ?? 0} tone="white" size={84} stroke={8} label={t("reports.classProgress")}>
          <span className="text-lg font-extrabold tabular-nums">{average}%</span>
        </ProgressRing>
        <div className="max-w-40 text-xs font-medium leading-snug text-white">
          <p className="font-bold">{t("reports.classProgress")}</p>
          <p>{t("reports.progressDerived")}</p>
        </div>
      </div>
    ) : detailed && !complete ? (
      <p className="text-xs font-semibold text-white">
        {t("reports.progressCalculating")}{" "}
        <span aria-hidden className="tabular-nums">
          {progress.size}/{learnerIds.length}
        </span>
      </p>
    ) : null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <CourseBand courseid={courseid} course={course} loading={courseLoading} aside={ring}>
        {graderUrl && (
          <Button href={graderUrl} external variant="light" size="sm">
            {t("reports.openGrader")}
            <ExternalLink size={15} aria-hidden />
          </Button>
        )}
      </CourseBand>
      {/* Announced once, when the class average is ready (not on every learner that loads). */}
      {detailed && (
        <p role="status" className="sr-only">
          {average !== null ? t("reports.classProgressAnnounce", { value: average }) : ""}
        </p>
      )}

      <QueryState
        loading={loading}
        error={error}
        skeleton={
          <div className="space-y-6">
            <StatsSkeleton />
            <ListSkeleton />
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard
              icon={Users}
              tone="primary"
              label={t("reports.enrolledUsers")}
              value={participants.length}
              hint={t("reports.staffCount", { n: summary.staff })}
            />
            <StatCard
              icon={GraduationCap}
              tone="violet"
              label={t("reports.students")}
              value={summary.students}
              hint={complete && summary.finished > 0 ? t("reports.finishedCount", { n: summary.finished }) : undefined}
            />
            <StatCard
              icon={Activity}
              tone="success"
              label={t("reports.activeWeek")}
              value={summary.activeWeek ?? "—"}
              hint={summary.activeWeek !== null ? t("reports.ofStudents", { n: summary.students }) : undefined}
            />
            <StatCard
              icon={UserX}
              tone="warning"
              label={t("reports.neverOpened")}
              value={summary.neverOpened ?? "—"}
              hint={summary.neverOpened !== null ? t("reports.ofStudents", { n: summary.students }) : undefined}
            />
          </div>

          {learnerIds.length > MAX_DETAIL_LEARNERS && (
            <p className="rounded-control bg-surface-2 px-4 py-3 text-[13px] text-muted">
              {t("reports.largeClass", { n: MAX_DETAIL_LEARNERS })}
            </p>
          )}

          <ParticipantsTable
            participants={participants}
            learners={learners}
            progress={detailed ? progress : null}
            totals={totals}
          />
        </div>
      </QueryState>
    </div>
  );
}
