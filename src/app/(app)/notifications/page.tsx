"use client";
import { useMemo, useState } from "react";
import { App } from "antd";
import { BellOff, CheckCheck, History, Loader2 } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Badge, Button, Card, EmptyState, PageHeader, QueryState, Skeleton } from "@/components/ui";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { useNotificationFeed } from "@/components/notifications/useNotificationFeed";
import { dayLabel, groupByDay } from "@/lib/format";
import { markAllNotificationsRead } from "@/lib/notifications";

export default function NotificationsPage() {
  const { user } = useSession();
  const t = useT();
  const { locale } = useLocale();
  const { message } = App.useApp();
  const feed = useNotificationFeed(user.id);
  const [marking, setMarking] = useState(false);

  const groups = useMemo(() => groupByDay(feed.items, (n) => n.timecreated), [feed.items]);

  async function markAllRead() {
    setMarking(true);
    try {
      await markAllNotificationsRead(user.id);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setMarking(false);
    }
  }

  async function loadMore() {
    try {
      await feed.loadMore();
    } catch (e) {
      message.error((e as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t("nav.notifications")}
        description={
          !feed.ready
            ? undefined
            : feed.unread > 0
              ? t("notifications.unreadCount", { count: feed.unread })
              : t("notifications.noneUnread")
        }
        actions={
          feed.unread > 0 ? (
            <Button variant="secondary" size="sm" onClick={markAllRead} disabled={marking}>
              {marking ? (
                <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
              ) : (
                <CheckCheck size={16} strokeWidth={1.75} />
              )}
              {t("notifications.markAllRead")}
            </Button>
          ) : undefined
        }
      />

      <QueryState loading={feed.loading} error={feed.error} skeleton={<FeedSkeleton />}>
        {feed.items.length === 0 ? (
          <Card>
            <EmptyState
              icon={BellOff}
              title={t("notifications.allCaughtUp")}
              hint={t("notifications.emptyHint")}
            />
          </Card>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <section key={g.key} aria-labelledby={`day-${g.key}`} className="animate-fade-in-up">
                <h2
                  id={`day-${g.key}`}
                  className="mb-2 flex items-center gap-2 px-1 text-sm font-bold text-fg"
                >
                  {dayLabel(g.time, locale)}
                  <Badge className="tabular-nums">{g.items.length}</Badge>
                </h2>
                <Card className="p-1.5 sm:p-2">
                  <ul className="space-y-1">
                    {g.items.map((n) => (
                      <li key={`${n.id}-${n.timecreated}`}>
                        <NotificationItem n={n} />
                      </li>
                    ))}
                  </ul>
                </Card>
              </section>
            ))}

            {feed.hasMore && (
              <div className="flex justify-center">
                <Button variant="secondary" onClick={loadMore} disabled={feed.loadingMore}>
                  {feed.loadingMore ? (
                    <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
                  ) : (
                    <History size={16} strokeWidth={1.75} />
                  )}
                  {t("notifications.loadOlder")}
                </Button>
              </div>
            )}
          </div>
        )}
      </QueryState>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-24" />
      <Card className="space-y-1 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-3">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
