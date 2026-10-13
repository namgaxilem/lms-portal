"use client";
import Link from "next/link";
import Image from "next/image";
import studyPhoto from "../../../../public/images/photos/study.webp";
import {
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  MessageSquare,
  PlayCircle,
  TrendingUp,
} from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useMoodle } from "@/lib/client-api";
import { useLocale, useT } from "@/i18n/I18nProvider";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Progress,
  QueryState,
  Skeleton,
  StatCard,
  IconTile,
  type Tone,
} from "@/components/ui";
import { CourseGrid, CourseThumb } from "@/components/CourseGrid";
import { timeAgo } from "@/lib/format";
import type { NotificationsResult, TimelineCourse } from "@/lib/moodle/types";

/** Moodle may include `lastaccess` on timeline courses; it isn't in the shared type. */
type CourseWithAccess = TimelineCourse & { lastaccess?: number | null };

function isCompleted(c: TimelineCourse) {
  return typeof c.progress === "number" && Math.round(c.progress) === 100;
}

function greetingKey() {
  const h = new Date().getHours();
  if (h < 12) return "dashboard.greetingMorning";
  if (h < 18) return "dashboard.greetingAfternoon";
  return "dashboard.greetingEvening";
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-4 rounded-xl border border-line bg-surface p-4">
        <Skeleton className="aspect-video w-32 shrink-0 sm:w-48" />
        <div className="flex-1 space-y-3 py-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-1.5 w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-line bg-surface">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-1.5 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useSession();
  const t = useT();

  const courses = useMoodle<{ courses: TimelineCourse[] }>(
    "core_course_get_enrolled_courses_by_timeline_classification",
    { classification: "inprogress", limit: 0, offset: 0, sort: "fullname" }
  );
  // All enrolments — only used for the enrolled / completed stat counts.
  const allCourses = useMoodle<{ courses: TimelineCourse[] }>(
    "core_course_get_enrolled_courses_by_timeline_classification",
    { classification: "all", limit: 0, offset: 0, sort: "fullname" }
  );
  const notifs = useMoodle<NotificationsResult>(
    "message_popup_get_popup_notifications",
    { useridto: user.id, newestfirst: 1, limit: 5, offset: 0 }
  );

  const inProgress = (courses.data?.courses ?? []) as CourseWithAccess[];
  const all = allCourses.data?.courses ?? [];
  const activity = notifs.data?.notifications ?? [];
  const firstName = user.fullname.split(" ").pop() || user.fullname;
  const { locale } = useLocale();
  const today = new Date().toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Most recently accessed unfinished course (falls back to list order).
  const resume = inProgress
    .filter((c) => !isCompleted(c))
    .reduce<CourseWithAccess | null>(
      (best, c) =>
        !best || (c.lastaccess ?? 0) > (best.lastaccess ?? 0) ? c : best,
      null
    );
  const resumePct =
    resume && typeof resume.progress === "number" ? Math.round(resume.progress) : null;

  const dash = (loading: boolean, v: number | undefined) =>
    loading || v === undefined ? "–" : v;

  const stats = [
    {
      label: t("dashboard.statCourses"),
      value: dash(allCourses.loading, allCourses.data ? all.length : undefined),
      icon: BookOpen,
      tone: "primary" as Tone,
    },
    {
      label: t("dashboard.statInProgress"),
      value: dash(courses.loading, courses.data ? inProgress.length : undefined),
      icon: TrendingUp,
      tone: "accent" as Tone,
    },
    {
      label: t("dashboard.statCompleted"),
      value: dash(
        allCourses.loading,
        allCourses.data ? all.filter(isCompleted).length : undefined
      ),
      icon: CheckCircle2,
      tone: "success" as Tone,
    },
    {
      label: t("dashboard.statUnread"),
      value: dash(notifs.loading, notifs.data?.unreadcount),
      icon: Bell,
      tone: "warning" as Tone,
    },
  ];

  const quickLinks = [
    { href: "/courses", icon: GraduationCap, label: t("nav.courses"), tone: "primary" as Tone },
    { href: "/grades", icon: Award, label: t("nav.grades"), tone: "success" as Tone },
    { href: "/messages", icon: MessageSquare, label: t("nav.messages"), tone: "accent" as Tone },
    { href: "/notifications", icon: Bell, label: t("nav.notifications"), tone: "warning" as Tone },
  ];

  return (
    <div className="animate-fade-in-up">
      {/* Welcome banner */}
      <section className="bg-mesh relative mb-6 overflow-hidden rounded-2xl border border-line bg-surface lg:mb-8">
        <div className="relative z-10 max-w-xl p-6 sm:p-8">
          <p className="text-[13px] font-medium capitalize text-primary-text">{today}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            {t(greetingKey(), { name: firstName })}
          </h1>
          <p className="mt-2 text-sm text-muted">{t("dashboard.inProgress")}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button href={resume ? `/courses/${resume.id}` : "/courses"}>
              <PlayCircle size={16} />
              {t("dashboard.continueLearning")}
            </Button>
            <Button href="/courses" variant="secondary">
              <BookOpen size={16} />
              {t("nav.courses")}
            </Button>
          </div>
        </div>
        <div className="absolute inset-y-0 right-0 hidden w-[42%] md:block">
          <Image
            src={studyPhoto}
            alt=""
            fill
            priority
            placeholder="blur"
            sizes="(min-width: 768px) 40vw, 0px"
            className="object-cover [mask-image:linear-gradient(to_right,transparent,black_45%)]"
          />
        </div>
      </section>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} tone={s.tone} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-6">
        {/* Main column */}
        <div className="min-w-0 space-y-8 lg:col-span-2">
          <QueryState
            loading={courses.loading}
            error={courses.error}
            skeleton={<DashboardSkeleton />}
          >
            {resume && (
              <section>
                <h2 className="mb-3 text-base font-semibold text-fg">
                  {t("dashboard.pickUp")}
                </h2>
                <Card className="flex flex-col overflow-hidden sm:flex-row sm:items-stretch">
                  <Link
                    href={`/courses/${resume.id}`}
                    className="block aspect-video shrink-0 border-b border-line sm:w-56 sm:border-b-0 sm:border-r"
                    tabIndex={-1}
                    aria-hidden
                  >
                    <CourseThumb course={resume} className="h-full w-full" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 p-5">
                    <div className="min-w-0">
                      <p className="truncate text-xs text-subtle">{resume.shortname}</p>
                      <Link
                        href={`/courses/${resume.id}`}
                        className="mt-0.5 line-clamp-2 text-base font-semibold text-fg hover:underline"
                      >
                        {resume.fullname}
                      </Link>
                    </div>
                    {resumePct !== null && (
                      <div className="flex items-center gap-3">
                        <Progress value={resumePct} className="flex-1" />
                        <span className="text-xs tabular-nums text-muted">
                          {resumePct}%
                        </span>
                      </div>
                    )}
                    <div>
                      <Button href={`/courses/${resume.id}`} size="sm">
                        <PlayCircle size={16} strokeWidth={1.75} />
                        {t("courses.resume")}
                      </Button>
                    </div>
                  </div>
                </Card>
              </section>
            )}

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-fg">
                  {t("dashboard.continueLearning")}
                </h2>
                <Link
                  href="/courses"
                  className="text-[13px] font-medium text-primary-text hover:underline"
                >
                  {t("dashboard.viewAll")}
                </Link>
              </div>
              <CourseGrid courses={inProgress} />
            </section>
          </QueryState>
        </div>

        {/* Right column */}
        <aside className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title={t("dashboard.recentActivity")}
              action={
                <Link
                  href="/notifications"
                  className="text-[13px] font-medium text-primary-text hover:underline"
                >
                  {t("dashboard.viewAll")}
                </Link>
              }
            />
            <QueryState
              loading={notifs.loading}
              error={notifs.error}
              skeleton={
                <div className="space-y-4 p-5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="mt-1 h-2 w-2 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-4/5" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              }
            >
              {activity.length === 0 ? (
                <EmptyState compact icon={Bell} title={t("dashboard.noActivity")} />
              ) : (
                <ol className="px-5 py-4">
                  {activity.map((n, i) => (
                    <li key={n.id} className="relative flex gap-3 pb-4 last:pb-0">
                      {i < activity.length - 1 && (
                        <span
                          aria-hidden
                          className="absolute left-[3px] top-4 h-[calc(100%-12px)] w-px bg-line"
                        />
                      )}
                      <span
                        aria-hidden
                        className={`relative mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full ${
                          n.read ? "bg-surface-3" : "bg-primary"
                        }`}
                      />
                      <Link
                        href="/notifications"
                        className="group min-w-0 flex-1"
                        title={n.smallmessage || n.subject}
                      >
                        <p className="line-clamp-2 text-[13px] text-fg group-hover:underline">
                          {n.subject}
                        </p>
                        <p className="mt-0.5 text-xs tabular-nums text-subtle">
                          {timeAgo(n.timecreated)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </QueryState>
          </Card>

          <Card>
            <CardHeader title={t("dashboard.quickActions")} />
            <div className="p-2">
              {quickLinks.map((q) => (
                <Link
                  key={q.href}
                  href={q.href}
                  className="group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-fg transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  <IconTile icon={q.icon} tone={q.tone} size="sm" />
                  <span className="flex-1">{q.label}</span>
                  <ChevronRight
                    size={16}
                    strokeWidth={1.75}
                    className="shrink-0 text-subtle"
                  />
                </Link>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
