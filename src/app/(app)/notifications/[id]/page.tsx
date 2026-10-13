"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BellOff } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { moodleClient, useMoodle } from "@/lib/client-api";
import { useLocale, useT } from "@/i18n/I18nProvider";
import {
  Button,
  Card,
  EmptyState,
  QueryState,
  RichText,
  Skeleton,
} from "@/components/ui";
import { accountRole, isStaffRole, timeAgo } from "@/lib/format";
import { notifyNotificationsChanged, portalLinkFor } from "@/lib/notifications";
import type {
  NotificationsResult,
  PopupNotification,
  UserProfile,
} from "@/lib/moodle/types";

const PAGE_SIZE = 50;
const MAX_PAGES = 6;

/** There is no get-by-id web service: page through the user's notifications. */
async function findNotification(userId: number, id: number) {
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await moodleClient<NotificationsResult>(
      "message_popup_get_popup_notifications",
      { useridto: userId, newestfirst: 1, limit: PAGE_SIZE, offset: page * PAGE_SIZE }
    );
    const list = res?.notifications ?? [];
    const hit = list.find((n) => n.id === id);
    if (hit) return hit;
    if (list.length < PAGE_SIZE) break;
  }
  return null;
}

interface Loaded {
  id: number;
  notification: PopupNotification | null;
  error: string | null;
}

export default function NotificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = use(params);
  const id = Number(rawId);
  const { user } = useSession();
  const t = useT();
  const { locale } = useLocale();
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const n = Number.isInteger(id) && id > 0 ? await findNotification(user.id, id) : null;
        if (cancelled) return;
        setLoaded({ id, notification: n, error: null });
        if (n && !n.read) {
          await moodleClient("core_message_mark_notification_read", {
            notificationid: n.id,
            timeread: 0,
          });
          notifyNotificationsChanged();
        }
      } catch (e) {
        if (!cancelled) setLoaded({ id, notification: null, error: (e as Error).message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user.id]);

  const loading = loaded?.id !== id;
  const n = loading ? null : loaded?.notification ?? null;

  // Sender name (best effort; system/no-reply senders have ids <= 0).
  const fromId = n && n.useridfrom > 0 && n.useridfrom !== user.id ? n.useridfrom : 0;
  const { data: senders } = useMoodle<UserProfile[]>(
    "core_user_get_users_by_field",
    { field: "id", values: [fromId] },
    !fromId
  );
  const senderName = senders?.[0]?.fullname;

  const link = n ? portalLinkFor(n, isStaffRole(accountRole(user))) : null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/notifications"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-subtle transition-colors hover:text-fg"
      >
        <ArrowLeft size={14} strokeWidth={1.75} />
        {t("notifications.back")}
      </Link>

      <QueryState
        loading={loading}
        error={loading ? null : loaded?.error ?? null}
        skeleton={
          <Card className="space-y-4 p-6">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </Card>
        }
      >
        {!n ? (
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
        ) : (
          <Card className="animate-fade-in-up overflow-hidden">
            <div className="border-b border-line px-6 py-5">
              <h1 className="text-xl font-semibold tracking-tight text-fg">{n.subject}</h1>
              <p className="mt-1.5 text-[13px] text-subtle">
                {senderName
                  ? t("notifications.from", { name: senderName })
                  : t("notifications.system")}
                {" · "}
                <time
                  dateTime={new Date(n.timecreated * 1000).toISOString()}
                  title={new Date(n.timecreated * 1000).toLocaleString(locale)}
                >
                  {timeAgo(n.timecreated)} ·{" "}
                  {new Date(n.timecreated * 1000).toLocaleString(locale)}
                </time>
              </p>
            </div>

            <div className="px-6 py-5 text-sm text-fg">
              {n.fullmessagehtml ? (
                <RichText html={n.fullmessagehtml} />
              ) : (
                <RichText html={n.fullmessage || n.smallmessage} plain />
              )}
            </div>

            {link && (
              <div className="flex justify-end border-t border-line px-6 py-4">
                <Button href={link}>
                  {n.contexturlname || t("notifications.open")}
                  <ArrowRight size={16} strokeWidth={1.75} />
                </Button>
              </div>
            )}
          </Card>
        )}
      </QueryState>
    </div>
  );
}
