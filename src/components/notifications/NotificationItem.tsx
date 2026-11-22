"use client";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { IconTile, cn } from "@/components/ui";
import { plainText, timeAgo } from "@/lib/format";
import type { PopupNotification } from "@/lib/moodle/types";
import { notificationMeta, toneText } from "./notification-meta";

/**
 * One notification as a link to its detail page: a type-coloured icon tile,
 * the subject and preview, then category · relative time. Unread items get a
 * solid tile, a tinted background, bold text and a dot (plus screen-reader text).
 * `compact` is the top-bar dropdown variant.
 */
export function NotificationItem({
  n,
  compact,
  onNavigate,
}: {
  n: PopupNotification;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const meta = notificationMeta(n);
  const unread = !n.read;
  const preview = n.smallmessage ? plainText(n.smallmessage) : "";

  return (
    <Link
      href={`/notifications/${n.id}`}
      onClick={onNavigate}
      className={cn(
        "group flex items-start gap-3 rounded-2xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
        compact ? "p-2.5" : "p-3 sm:p-4",
        unread ? "bg-primary-soft/60 hover:bg-primary-soft" : "hover:bg-surface-2"
      )}
    >
      <IconTile icon={meta.icon} tone={meta.tone} size={compact ? "sm" : "md"} solid={unread} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p
            className={cn(
              "line-clamp-2 text-sm leading-snug",
              unread ? "font-bold text-fg" : "font-medium text-muted"
            )}
          >
            {unread && <span className="sr-only">{t("notifications.unreadLabel")}: </span>}
            {n.subject}
          </p>
          {unread && <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
        </div>
        {preview && (
          <p className={cn("mt-0.5 text-[13px] text-subtle", compact ? "line-clamp-1" : "line-clamp-2")}>
            {preview}
          </p>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-subtle">
          <span className={cn("font-semibold", toneText[meta.tone])}>{t(meta.labelKey)}</span>
          <span aria-hidden>·</span>
          <time dateTime={new Date(n.timecreated * 1000).toISOString()} className="tabular-nums">
            {timeAgo(n.timecreated, locale)}
          </time>
        </p>
      </div>
      {!compact && (
        <ChevronRight
          size={16}
          strokeWidth={1.75}
          aria-hidden
          className="mt-3 hidden shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-fg sm:block"
        />
      )}
    </Link>
  );
}
