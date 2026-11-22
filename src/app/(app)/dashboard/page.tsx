"use client";
import { useEffect, useMemo } from "react";
import { GraduationCap } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Button, Card, EmptyState, QueryState, SectionTitle, cn } from "@/components/ui";
import { CourseGrid, CourseGridSkeleton } from "@/components/CourseGrid";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { MilestonesCard } from "@/components/dashboard/MilestonesCard";
import { NewsCard } from "@/components/dashboard/NewsCard";
import { ResumeHero, ResumeHeroEmpty, ResumeHeroSkeleton } from "@/components/dashboard/ResumeHero";
import { SectionLink } from "@/components/dashboard/SectionLink";
import { StudyTip } from "@/components/dashboard/StudyTip";
import { UpcomingDates } from "@/components/dashboard/UpcomingDates";
import { WeekActivityCard } from "@/components/dashboard/WeekActivityCard";
import { countRecentNews } from "@/components/dashboard/lib";
import { WEEK, useUpcomingDates, type UpcomingDate } from "@/components/dashboard/useUpcomingDates";
import { moodleClient, useMoodle } from "@/lib/client-api";
import { courseProgress } from "@/lib/courses";
import { accountRole, formatTime, greetingName, isStaffRole, isToday } from "@/lib/format";
import { computeMilestones } from "@/lib/learning";
import {
  useContinueLearning,
  useCourseDetails,
  useEnrolledCourses,
  useMyLearningActivity,
  useNewsFeed,
  useSiteFunctions,
} from "@/lib/moodle/hooks";

const MIN = 60_000;
/** Course cards on the dashboard; the rest are one click away on /courses. */
const COURSE_LIMIT = 6;
/** Announcements listed; more are fetched so the "last 7 days" badge can count them. */
const NEWS_SHOWN = 4;
const NEWS_PER_FORUM = 5;

/** Moodle 4.3+: record the "dashboard viewed" event, as the mobile app does. */
function useLogDashboardView() {
  const supported = useSiteFunctions().has("core_my_view_page") === true;
  useEffect(() => {
    if (supported) moodleClient("core_my_view_page", { page: "dashboard" }).catch(() => {});
  }, [supported]);
}

/** One-line summary under the greeting, from the upcoming dates. */
function DatesSummary({ soon }: { soon: UpcomingDate[] }) {
  const t = useT();
  const { locale } = useLocale();
  const closingToday = soon.filter((d) => (d.kind === "close" || d.kind === "due") && isToday(d.time));
  if (closingToday.length) {
    return (
      <b className="font-semibold text-error-text">
        {t("dashboard.summaryClosesToday", { n: closingToday.length, time: formatTime(closingToday[0].time, locale) })}
      </b>
    );
  }
  return <>{soon.length ? t("dashboard.summaryWeek", { n: soon.length }) : t("dashboard.summaryClearDates")}</>;
}

export default function DashboardPage() {
  const t = useT();
  const { user } = useSession();
  const staff = isStaffRole(accountRole(user));

  const enrolled = useEnrolledCourses("inprogress");
  // In-progress courses, most recently accessed first, and where "Continue" leads.
  const resume = useContinueLearning();
  // Every tracked enrolment, ended and hidden courses too: the all-time totals,
  // streaks and milestones are the same as in the shell, /grades and /profile.
  const learning = useMyLearningActivity();
  const unread = useMoodle<number>("core_message_get_unread_conversations_count", { useridto: user.id }, false, {
    cacheMs: MIN,
  });
  const upcoming = useUpcomingDates();
  useLogDashboardView();

  const ids = enrolled.courses.map((c) => c.id);
  const details = useCourseDetails(ids);
  const news = useNewsFeed(ids, { perForum: NEWS_PER_FORUM, limit: Infinity });

  const { courses: inProgress, access, target } = resume;
  const courseNames = useMemo(() => new Map(inProgress.map((c) => [c.id, c] as const)), [inProgress]);

  /* ---------------- Progress & learning activity ---------------- */

  // Average over in-progress courses Moodle tracks for this user (never a fake 0%).
  const percents = inProgress.flatMap((c) => {
    const p = courseProgress(c);
    return p === null ? [] : [p];
  });
  const avgProgress = percents.length ? Math.round(percents.reduce((s, p) => s + p, 0) / percents.length) : null;
  // Without any tracked course (staff, or a school without completion) the widgets would only show zeros.
  const showLearning = learning.loading || (learning.tracked.length > 0 && !!learning.stats);
  const milestones = learning.stats
    ? computeMilestones(learning.stats, learning.tracked.map((c) => c.progress ?? 0))
    : [];

  /* ---------------- Dates & news ---------------- */

  const soon = upcoming.dates.filter((d) => d.time >= upcoming.now && d.time <= upcoming.now + WEEK);
  const recentNews = countRecentNews(news.items, upcoming.now - WEEK, NEWS_PER_FORUM);

  const heroClass = showLearning ? "lg:col-span-2" : undefined;

  return (
    <div className="animate-fade-in-up space-y-6">
      <DashboardGreeting
        name={greetingName(user)}
        summary={upcoming.loading || upcoming.error ? null : <DatesSummary soon={soon} />}
      />

      <div className={cn("grid gap-6", showLearning && "lg:grid-cols-3")}>
        {resume.loading ? (
          <ResumeHeroSkeleton className={heroClass} />
        ) : target ? (
          <ResumeHero target={target} lastAccess={access.get(target.course.id)} staff={staff} className={heroClass} />
        ) : (
          <ResumeHeroEmpty
            state={resume.coursesError ? "error" : inProgress.length > 0 ? "noActivity" : "noCourses"}
            onRetry={resume.reload}
            className={heroClass}
          />
        )}
        {showLearning && <WeekActivityCard stats={learning.stats} loading={learning.loading} />}
      </div>

      <DashboardStats
        staff={staff}
        courses={{ value: enrolled.data ? enrolled.courses.length : null, loading: enrolled.loading }}
        avgProgress={{ value: avgProgress, loading: enrolled.loading }}
        trackedCount={enrolled.error ? null : percents.length}
        upcoming={{ value: upcoming.error ? null : soon.length, loading: upcoming.loading }}
        todo={soon.filter((d) => d.todo).length}
        unread={{ value: unread.data, loading: unread.loading }}
      />

      <div className="grid gap-6 pt-2 lg:grid-cols-3">
        <div className="min-w-0 space-y-8 lg:col-span-2">
          <UpcomingDates dates={upcoming.dates} now={upcoming.now} loading={upcoming.loading} error={upcoming.error} />

          <section aria-labelledby="dashboard-courses">
            <SectionTitle
              title={<span id="dashboard-courses">{t("nav.courses")}</span>}
              action={<SectionLink href="/courses">{t("dashboard.viewAll")}</SectionLink>}
            />
            <QueryState loading={resume.coursesLoading} error={resume.coursesError} skeleton={<CourseGridSkeleton count={3} />}>
              {inProgress.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={GraduationCap}
                    title={t("dashboard.noCoursesTitle")}
                    hint={t("dashboard.noCoursesHint")}
                    action={
                      <Button href="/courses" variant="secondary">
                        {t("nav.courses")}
                      </Button>
                    }
                  />
                </Card>
              ) : (
                <CourseGrid
                  courses={inProgress.slice(0, COURSE_LIMIT)}
                  view="grid"
                  details={details.byId}
                  lastAccess={access}
                />
              )}
            </QueryState>
          </section>
        </div>

        <div className="min-w-0 space-y-6">
          <NewsCard
            items={news.items.slice(0, NEWS_SHOWN)}
            recent={recentNews}
            loading={enrolled.loading || news.loading}
            error={news.error ?? enrolled.error}
            courses={courseNames}
          />
          {showLearning && <MilestonesCard milestones={milestones} loading={learning.loading} />}
          {!staff && <StudyTip />}
        </div>
      </div>
    </div>
  );
}
