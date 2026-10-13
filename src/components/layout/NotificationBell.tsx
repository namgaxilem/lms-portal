"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Dropdown } from "antd";
import { ArrowRight, Bell, BellOff } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { cn } from "@/components/ui/cn";
import { timeAgo } from "@/lib/format";
import { NOTIFICATIONS_CHANGED } from "@/lib/notifications";
import type { NotificationsResult } from "@/lib/moodle/types";

/**
 * Top-bar notification bell. Clicking opens a dropdown preview of the most
 * recent notifications with a footer link to the full notifications page.
 */
export function NotificationBell() {
  const { user } = useSession();
  const t = useT();
  const [open, setOpen] = useState(false);

  const { data, reload } = useMoodle<NotificationsResult>(
    "message_popup_get_popup_notifications",
    { useridto: user.id, newestfirst: 1, limit: 6, offset: 0 }
  );

  // Refresh the badge/preview when a page marks notifications as read.
  useEffect(() => {
    const onChange = () => void reload();
    window.addEventListener(NOTIFICATIONS_CHANGED, onChange);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, onChange);
  }, [reload]);

  const notifications = data?.notifications ?? [];
  const unread = data?.unreadcount ?? 0;

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={["click"]}
      placement="bottomRight"
      popupRender={() => (
        <div className="w-80 max-w-[92vw] overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="text-sm font-semibold text-fg">{t("nav.notifications")}</h3>
            {unread > 0 && (
              <span className="rounded-md bg-primary-soft px-1.5 text-xs font-medium tabular-nums text-primary-text">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto p-1.5">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center text-subtle">
                <BellOff size={20} strokeWidth={1.75} />
                <p className="text-[13px]">{t("notifications.allCaughtUp")}</p>
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={`/notifications/${n.id}`}
                  onClick={() => setOpen(false)}
                  title={n.smallmessage || n.subject}
                  className="flex gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-surface-2"
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      n.read ? "bg-transparent" : "bg-primary"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "line-clamp-1 text-sm",
                          n.read ? "text-muted" : "font-medium text-fg"
                        )}
                      >
                        {n.subject}
                      </p>
                      <span className="shrink-0 text-xs tabular-nums text-subtle">
                        {timeAgo(n.timecreated)}
                      </span>
                    </div>
                    {n.smallmessage && (
                      <p className="mt-0.5 line-clamp-2 text-[13px] text-subtle">
                        {n.smallmessage}
                      </p>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 border-t border-line px-4 py-2.5 text-[13px] font-medium text-primary-text transition-colors hover:bg-surface-2"
          >
            {t("notifications.viewAll")}
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
    >
      <button
        type="button"
        aria-label={t("nav.notifications")}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <Bell size={18} strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error ring-2 ring-surface" />
        )}
      </button>
    </Dropdown>
  );
}
