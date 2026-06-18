"use client";
import Link from "next/link";
import { useSession } from "@/components/providers/SessionProvider";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { QueryState } from "@/components/ui/QueryState";
import { CourseGrid } from "@/components/CourseGrid";
import { MaterialIcon } from "@/components/MaterialIcon";
import type { NotificationsResult, TimelineCourse } from "@/lib/moodle/types";

function timeAgo(unix: number) {
  const m = Math.floor(Date.now() / 1000 - unix) / 60;
  if (m < 60) return `${Math.max(1, Math.floor(m))}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
}

export default function DashboardPage() {
  const { user } = useSession();
  const t = useT();

  const courses = useMoodle<{ courses: TimelineCourse[] }>(
    "core_course_get_enrolled_courses_by_timeline_classification",
    { classification: "inprogress", limit: 0, offset: 0, sort: "fullname" }
  );
  const notifs = useMoodle<NotificationsResult>(
    "message_popup_get_popup_notifications",
    { useridto: user.id, newestfirst: 1, limit: 5, offset: 0 }
  );

  const inProgress = courses.data?.courses ?? [];
  const activity = notifs.data?.notifications ?? [];
  const firstName = user.fullname.split(" ").pop() ?? user.fullname;

  const quickLinks = [
    { href: "/courses", icon: "school", label: t("nav.courses") },
    { href: "/grades", icon: "workspace_premium", label: t("nav.grades") },
    { href: "/messages", icon: "chat", label: t("nav.messages") },
    { href: "/notifications", icon: "notifications", label: t("nav.notifications") },
  ];

  return (
    <div className="space-y-lg">
      {/* Hero */}
      <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h2 className="mb-2 font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
            {t("dashboard.welcome", { name: firstName })}
          </h2>
          <p className="max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
            {t("dashboard.inProgress")}
          </p>
        </div>
        <div className="flex items-center gap-4 rounded-xl bg-surface-container-lowest p-4 card-elevation">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
            <MaterialIcon name="local_fire_department" fill />
          </div>
          <div>
            <p className="text-[20px] font-bold text-on-surface">
              {inProgress.length}
            </p>
            <p className="font-label-md text-label-md text-outline">
              {t("dashboard.coursesInProgress")}
            </p>
          </div>
        </div>
      </section>

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
        {/* Left */}
        <div className="space-y-gutter lg:col-span-8">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-md text-headline-md text-on-surface">
              {t("dashboard.continueLearning")}
            </h3>
            <Link
              href="/courses"
              className="font-label-md text-label-md text-primary hover:underline"
            >
              {t("dashboard.viewAll")}
            </Link>
          </div>

          <QueryState loading={courses.loading} error={courses.error}>
            <CourseGrid courses={inProgress} />
          </QueryState>

          <div className="space-y-gutter pt-2">
            <h3 className="font-headline-md text-headline-md text-on-surface">
              {t("dashboard.recentActivity")}
            </h3>
            <div className="space-y-4 rounded-xl bg-surface-container-lowest p-gutter card-elevation">
              {activity.length === 0 ? (
                <p className="py-4 text-center font-body-sm text-body-sm text-on-surface-variant">
                  {t("notifications.allCaughtUp")}
                </p>
              ) : (
                activity.map((n) => (
                  <div key={n.id} className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container/10 text-primary">
                      <MaterialIcon name="notifications" className="!text-lg" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-body-md text-body-md text-on-surface">
                          <span className="font-bold">{n.subject}</span>
                        </p>
                        <span className="whitespace-nowrap text-xs text-outline">
                          {timeAgo(n.timecreated)}
                        </span>
                      </div>
                      <p className="line-clamp-2 font-body-sm text-body-sm text-on-surface-variant">
                        {n.smallmessage}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-gutter lg:col-span-4">
          <div className="rounded-xl bg-surface-container-lowest p-gutter card-elevation">
            <h3 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
              {t("dashboard.quickActions")}
            </h3>
            <div className="space-y-2">
              {quickLinks.map((q) => (
                <Link
                  key={q.href}
                  href={q.href}
                  className="group flex items-center gap-3 rounded-xl border border-outline-variant p-3 transition-all hover:border-primary hover:bg-primary-container/5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container text-primary">
                    <MaterialIcon name={q.icon} />
                  </div>
                  <span className="flex-1 font-body-md font-semibold text-on-surface">
                    {q.label}
                  </span>
                  <MaterialIcon
                    name="chevron_right"
                    className="text-outline transition-transform group-hover:translate-x-1"
                  />
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-primary to-tertiary p-gutter text-on-primary card-elevation">
            <div className="mb-4 flex items-center gap-3">
              <MaterialIcon name="account_balance" fill className="!text-3xl" />
              <h4 className="font-headline-sm text-headline-sm">
                {user.sitename}
              </h4>
            </div>
            <p className="font-body-sm text-body-sm opacity-80">
              {user.fullname}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-bold capitalize backdrop-blur-sm">
              <MaterialIcon name="verified_user" fill className="!text-sm" />
              {t(`role.${user.highestRole ?? (user.isSiteAdmin ? "admin" : "student")}`)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
