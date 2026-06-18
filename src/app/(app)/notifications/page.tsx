"use client";
import { useSession } from "@/components/providers/SessionProvider";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { QueryState } from "@/components/ui/QueryState";
import { MaterialIcon } from "@/components/MaterialIcon";
import type { NotificationsResult } from "@/lib/moodle/types";

function timeAgo(unix: number) {
  const m = Math.floor(Date.now() / 1000 - unix) / 60;
  if (m < 1) return "now";
  if (m < 60) return `${Math.floor(m)}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
}

export default function NotificationsPage() {
  const { user } = useSession();
  const t = useT();
  const { data, loading, error } = useMoodle<NotificationsResult>(
    "message_popup_get_popup_notifications",
    { useridto: user.id, newestfirst: 1, limit: 30, offset: 0 }
  );

  const notifications = data?.notifications ?? [];

  return (
    <div className="space-y-gutter">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container/10 text-primary">
          <MaterialIcon name="notifications" fill />
        </div>
        <h2 className="font-headline-md text-headline-md text-on-surface">
          {t("nav.notifications")}
        </h2>
      </div>

      <QueryState loading={loading} error={error}>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl bg-surface-container-lowest p-lg text-center card-elevation">
            <MaterialIcon
              name="notifications_off"
              className="!text-5xl text-outline-variant"
            />
            <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
              {t("notifications.allCaughtUp")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n, i) => (
              <div
                key={n.id}
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                className={`flex items-start gap-4 rounded-xl bg-surface-container-lowest p-4 card-elevation animate-fade-in-up ${
                  n.read ? "" : "border-l-4 border-primary"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    n.read
                      ? "bg-surface-container text-on-surface-variant"
                      : "bg-primary-container/10 text-primary"
                  }`}
                >
                  <MaterialIcon name="campaign" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-body-md text-body-md font-bold text-on-surface">
                      {n.subject}
                    </h3>
                    <span className="whitespace-nowrap text-xs text-outline">
                      {timeAgo(n.timecreated)}
                    </span>
                  </div>
                  <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                    {n.smallmessage}
                  </p>
                  {n.contexturl && (
                    <a
                      href={n.contexturl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:underline"
                    >
                      {n.contexturlname || t("common.view")}
                      <MaterialIcon name="arrow_forward" className="!text-sm" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
