"use client";
import { use, useEffect, useMemo, useState } from "react";
import { ArrowRight, BellOff } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { moodleClient, useMoodle } from "@/lib/client-api";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { BackLink, Button, Card, EmptyState, IconTile, QueryState, RichText, Skeleton, cn } from "@/components/ui";
import { notificationMeta, toneText } from "@/components/notifications/notification-meta";
import { formatDateTime, timeAgo } from "@/lib/format";
import {
  fetchNotifications,
  notifyNotificationsChanged,
  portalLinkFor,
  recentNotification,
  rememberNotifications,
} from "@/lib/notifications";
import type { PopupNotification, UserProfile } from "@/lib/moodle/types";

const PAGE_SIZE = 50;
const MAX_PAGES = 6;

/** Cold load (no list visited first): page through the user's notifications. */
async function findNotification(userId: number, id: number) {
  for (let page = 0; page < MAX_PAGES; page++) {
    const { items: list } = await fetchNotifications(userId, page * PAGE_SIZE, PAGE_SIZE);
    const hit = list.find((n) => n.id === id);
    if (hit) return hit;
    if (list.length < PAGE_SIZE) break;
  }
  return null;
}

interface Fetched {
  id: number;
  notification: PopupNotification | null;
  error: string | null;
}

export default function NotificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  const id = Number(rawId);
  const valid = Number.isInteger(id) && id > 0;
  const { user } = useSession();
  const t = useT();

  // Opened from a list in this tab: show it straight away.
  const cached = useMemo(() => (valid ? recentNotification(user.id, id) : null), [valid, user.id, id]);
  const [fetched, setFetched] = useState<Fetched | null>(null);

  useEffect(() => {
    if (cached || !valid) return;
    let cancelled = false;
    findNotification(user.id, id).then(
      (notification) => !cancelled && setFetched({ id, notification, error: null }),
      (e: Error) => !cancelled && setFetched({ id, notification: null, error: e.message })
    );
    return () => {
      cancelled = true;
    };
  }, [cached, valid, id, user.id]);

  const current = fetched?.id === id ? fetched : null;
  const loading = !cached && valid && !current;
  const n = cached ?? current?.notification ?? null;

  // Mark it read once shown. A failure only leaves the unread badge: keep the
  // notification on screen rather than replacing it with an error.
  const unread = n && !n.read ? n : null;
  useEffect(() => {
    if (!unread) return;
    moodleClient("core_message_mark_notification_read", { notificationid: unread.id, timeread: 0 }).then(
      () => {
        rememberNotifications(user.id, [{ ...unread, read: true }]);
        notifyNotificationsChanged();
      },
      () => {
        /* Stays unread in Moodle; nothing to show the user. */
      }
    );
  }, [unread, user.id]);

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/notifications" className="mb-2">
        {t("notifications.back")}
      </BackLink>

      <QueryState loading={loading} error={current?.error ?? null} skeleton={<DetailSkeleton />}>
        {n ? (
          <NotificationDetail n={n} />
        ) : (
          <Card>
            <EmptyState
              icon={BellOff}
              title={t("notifications.notFound")}
              hint={t("notifications.notFoundHint")}
              action={
                <Button variant="secondary" size="sm" href="/notifications">
                  {t("notifications.back")}
                </Button>
              }
            />
          </Card>
        )}
      </QueryState>
    </div>
  );
}

function NotificationDetail({ n }: { n: PopupNotification }) {
  const { user } = useSession();
  const t = useT();
  const { locale } = useLocale();
  const meta = notificationMeta(n);

  // Moodle's no-reply/support senders have ids <= 0. A real sender whose
  // profile the viewer cannot see simply gets no "From" line.
  const isSystem = n.useridfrom <= 0;
  const fromId = !isSystem && n.useridfrom !== user.id ? n.useridfrom : 0;
  const { data: senders } = useMoodle<UserProfile[]>(
    "core_user_get_users_by_field",
    { field: "id", values: [fromId] },
    !fromId
  );
  const senderName = senders?.[0]?.fullname;
  const from = isSystem
    ? t("notifications.system")
    : senderName
      ? t("notifications.from", { name: senderName })
      : null;

  const link = portalLinkFor(n);
  const linkLabel = n.contexturlname || t("notifications.open");

  return (
    <Card className="animate-fade-in-up overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-start sm:p-7">
        <IconTile icon={meta.icon} tone={meta.tone} size="lg" solid />
        <div className="min-w-0 flex-1">
          <p className={cn("text-xs font-bold uppercase tracking-wide", toneText[meta.tone])}>
            {t(meta.labelKey)}
          </p>
          <h1 className="mt-1 text-xl font-extrabold leading-snug tracking-tight text-fg sm:text-2xl">
            {n.subject}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-subtle">
            {from && (
              <>
                <span className="font-medium text-muted">{from}</span>
                <span aria-hidden>·</span>
              </>
            )}
            <time dateTime={new Date(n.timecreated * 1000).toISOString()} className="tabular-nums">
              {timeAgo(n.timecreated, locale)} · {formatDateTime(n.timecreated, locale)}
            </time>
          </p>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        {n.fullmessagehtml ? (
          <RichText html={n.fullmessagehtml} className="text-[15px]" />
        ) : (
          <RichText html={n.fullmessage || n.smallmessage} plain className="text-[15px]" />
        )}
      </div>

      {link && (
        <div className="flex justify-end border-t border-line bg-surface-2/50 px-5 py-4 sm:px-7">
          {/* Activity names can be long: truncate instead of overflowing the card. */}
          <Button variant="gradient" href={link} className="max-w-full" title={linkLabel}>
            <span className="min-w-0 truncate">{linkLabel}</span>
            <ArrowRight size={16} strokeWidth={2} />
          </Button>
        </div>
      )}
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <Card className="space-y-4 p-6 sm:p-7">
      <div className="flex gap-4">
        <Skeleton className="h-14 w-14 rounded-2xl" />
        <div className="flex-1 space-y-2.5 pt-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-28 w-full" />
    </Card>
  );
}
