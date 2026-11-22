"use client";
import type { ReactNode } from "react";
import { BookOpen, CalendarClock, ClipboardCheck, MessageCircle, TrendingUp } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { StatCard } from "@/components/ui";
import { useGradableCourses } from "@/components/grading/useGradableCourses";

/** A stat value, or "–" while loading / unavailable. */
interface StatValue {
  value: number | null;
  loading: boolean;
}

const show = (s: StatValue, suffix = "") => (s.loading || s.value === null ? "–" : `${s.value}${suffix}`);

/** StatCard truncates its label and hint to one line; on two-column phones they may need two. */
const wrap = (text: ReactNode) => <span className="whitespace-normal">{text}</span>;

/**
 * KPI row. Learners see their average progress over courses Moodle tracks;
 * staff (never completion-tracked) see the assignments they grade instead.
 */
export function DashboardStats({
  staff,
  courses,
  avgProgress,
  trackedCount,
  upcoming,
  todo,
  unread,
}: {
  staff: boolean;
  courses: StatValue;
  avgProgress: StatValue;
  /** In-progress courses with tracked progress; null when the course list failed. */
  trackedCount: number | null;
  upcoming: StatValue;
  /** Dates within the next 7 days that Moodle still lists as to do. */
  todo: number;
  unread: StatValue;
}) {
  const t = useT();
  const progressHint =
    avgProgress.loading || trackedCount === null
      ? undefined
      : trackedCount > 0
        ? t("dashboard.hintTracked", { n: trackedCount })
        : t("dashboard.notTracked");

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <StatCard
        icon={BookOpen}
        tone="primary"
        label={wrap(staff ? t("dashboard.statActiveCourses") : t("dashboard.statInProgress"))}
        value={show(courses)}
        href="/courses"
      />
      {!staff && (
        <StatCard
          icon={TrendingUp}
          tone="success"
          label={wrap(t("dashboard.statAvgProgress"))}
          value={show(avgProgress, "%")}
          hint={progressHint && wrap(progressHint)}
        />
      )}
      <StatCard
        icon={CalendarClock}
        tone="danger"
        label={wrap(t("dashboard.statUpcoming"))}
        value={show(upcoming)}
        hint={!upcoming.loading && todo > 0 ? wrap(t("dashboard.hintTodo", { n: todo })) : undefined}
      />
      <StatCard
        icon={MessageCircle}
        tone="violet"
        label={wrap(t("dashboard.statUnreadConversations"))}
        value={show(unread)}
        href="/messages"
      />
      {staff && <GradableStat />}
    </div>
  );
}

/**
 * Assignments the user may grade (the shell's cached mod/assign:grade check),
 * linking to grading. Hidden while loading, on failure and when there are none,
 * exactly like the Grading nav item.
 */
function GradableStat() {
  const t = useT();
  const { courses } = useGradableCourses();
  const assignments = courses.reduce((sum, c) => sum + c.assignments.length, 0);
  if (assignments === 0) return null;
  return (
    <StatCard
      icon={ClipboardCheck}
      tone="warning"
      label={wrap(t("dashboard.statGradable"))}
      value={assignments}
      href="/teacher/grading"
    />
  );
}
