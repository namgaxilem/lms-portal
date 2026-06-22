"use client";
import Link from "next/link";
import { useState } from "react";
import { Dropdown, Tooltip } from "antd";
import { useSession } from "@/components/providers/SessionProvider";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { MaterialIcon } from "@/components/MaterialIcon";
import type { NotificationsResult } from "@/lib/moodle/types";

function timeAgo(unix: number) {
  const m = (Date.now() / 1000 - unix) / 60;
  if (m < 1) return "now";
  if (m < 60) return `${Math.floor(m)}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
}

/**
 * Top-bar notification bell. Clicking opens a dropdown preview of the most
 * recent notifications with a footer link to the full notifications page.
 */
export function NotificationBell() {
  const { user } = useSession();
  const t = useT();
  const [open, setOpen] = useState(false);

  const { data } = useMoodle<NotificationsResult>(
    "message_popup_get_popup_notifications",
    { useridto: user.id, newestfirst: 1, limit: 6, offset: 0 }
  );

  const notifications = data?.notifications ?? [];
  const unread = data?.unreadcount ?? 0;

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={["click"]}
      placement="bottomRight"
      popupRender={() => (
        <div className="w-80 max-w-[90vw] overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest card-elevation">
          <div className="flex items-center justify-between border-b border-outline-variant/20 px-4 py-3">
            <h3 className="font-body-md text-body-md font-bold text-on-surface">
              {t("nav.notifications")}
            </h3>
            {unread > 0 && (
              <span className="rounded-full bg-error px-2 py-0.5 text-[10px] font-bold text-on-error">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <MaterialIcon
                  name="notifications_off"
                  className="!text-3xl text-outline-variant"
                />
                <p className="mt-2 text-xs text-on-surface-variant">
                  {t("notifications.allCaughtUp")}
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href="/notifications"
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-container ${
                    n.read ? "" : "bg-primary-container/5"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      n.read
                        ? "bg-surface-container text-on-surface-variant"
                        : "bg-primary-container/10 text-primary"
                    }`}
                  >
                    <MaterialIcon name="campaign" className="!text-base" />
                  </div>
                  <Tooltip
                    placement="left"
                    title={
                      <div className="space-y-1">
                        <p className="font-semibold">{n.subject}</p>
                        {n.smallmessage && (
                          <p className="text-xs opacity-90">{n.smallmessage}</p>
                        )}
                      </div>
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 font-body-sm text-body-sm font-semibold text-on-surface">
                          {n.subject}
                        </p>
                        <span className="shrink-0 text-[10px] text-outline">
                          {timeAgo(n.timecreated)}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs text-on-surface-variant">
                        {n.smallmessage}
                      </p>
                    </div>
                  </Tooltip>
                </Link>
              ))
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 border-t border-outline-variant/20 px-4 py-3 font-label-md text-label-md font-semibold text-primary transition-colors hover:bg-surface-container"
          >
            {t("notifications.viewAll")}
            <MaterialIcon name="arrow_forward" className="!text-sm" />
          </Link>
        </div>
      )}
    >
      <button
        aria-label={t("nav.notifications")}
        className="relative rounded-full p-2 text-on-surface-variant transition-colors hover:text-primary"
      >
        <MaterialIcon name="notifications" />
        {unread ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-on-error">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
    </Dropdown>
  );
}
