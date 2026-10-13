"use client";
import { useState } from "react";
import Link from "next/link";
import { App } from "antd";
import { BellOff, CheckCheck, ChevronRight } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { moodleClient, useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  QueryState,
  Skeleton,
  cn,
} from "@/components/ui";
import { isToday, timeAgo } from "@/lib/format";
import { notifyNotificationsChanged } from "@/lib/notifications";
import type { NotificationsResult, PopupNotification } from "@/lib/moodle/types";

export default function NotificationsPage() {
  const { user } = useSession();
  const t = useT();
  const { message } = App.useApp();
  const [marking, setMarking] = useState(false);
  const { data, loading, error, reload } = useMoodle<NotificationsResult>(
    "message_popup_get_popup_notifications",
    { useridto: user.id, newestfirst: 1, limit: 30, offset: 0 }
  );

  const notifications = data?.notifications ?? [];
  const unread = data?.unreadcount ?? notifications.filter((n) => !n.read).length;

  const groups = [
    { key: "today", title: t("common.today"), items: notifications.filter((n) => isToday(n.timecreated)) },
    { key: "earlier", title: t("common.earlier"), items: notifications.filter((n) => !isToday(n.timecreated)) },
  ].filter((g) => g.items.length > 0);

  async function markAllRead() {
    setMarking(true);
    try {
      await moodleClient("core_message_mark_all_notifications_as_read", {
        useridto: user.id,
      });
      reload();
      notifyNotificationsChanged();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setMarking(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t("nav.notifications")}
        description={
          data && unread > 0
            ? t("notifications.unreadCount", { count: unread })
            : undefined
        }
        actions={
          unread > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={markAllRead}
              disabled={marking}
            >
              <CheckCheck size={16} strokeWidth={1.75} />
              {t("notifications.markAllRead")}
            </Button>
          ) : undefined
        }
      />

      <QueryState
        loading={loading}
        error={error}
        skeleton={
          <Card className="divide-y divide-line">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2 px-5 py-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </Card>
        }
      >
        {notifications.length === 0 ? (
          <Card>
            <EmptyState icon={BellOff} title={t("notifications.allCaughtUp")} />
          </Card>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <Card key={g.key} className="animate-fade-in-up overflow-hidden">
                <CardHeader title={g.title} />
                <ul className="divide-y divide-line">
                  {g.items.map((n) => (
                    <NotificationRow key={n.id} n={n} />
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}

function NotificationRow({ n }: { n: PopupNotification }) {
  return (
    <li>
      <Link
        href={`/notifications/${n.id}`}
        className="group flex gap-3 px-5 py-4 transition-colors hover:bg-surface-2"
      >
        <span className="mt-[7px] flex w-2 shrink-0 justify-center">
          {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <p
              className={cn(
                "text-sm",
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
            <p className="mt-1 line-clamp-2 text-[13px] text-subtle">
              {n.smallmessage}
            </p>
          )}
        </div>
        <ChevronRight
          size={16}
          strokeWidth={1.75}
          className="mt-0.5 shrink-0 text-subtle transition-colors group-hover:text-fg"
          aria-hidden
        />
      </Link>
    </li>
  );
}
