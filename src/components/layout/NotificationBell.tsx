"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { App } from "antd";
import { ArrowRight, Bell, BellOff, CheckCheck, Loader2 } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { Badge, Button, IconTile, Skeleton, cn } from "@/components/ui";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { NOTIFICATIONS_CHANGED, markAllNotificationsRead, rememberNotifications } from "@/lib/notifications";
import type { NotificationsResult } from "@/lib/moodle/types";

const PREVIEW = 6;

/**
 * Top-bar notification bell. `unread` comes from the shell, which polls the
 * count for the sidebar badge too. The panel is a disclosure rendered right
 * after the button, so Tab moves through its links in order; Escape or a click
 * outside closes it. On phones it spans the screen below the top bar, sized
 * from the shell's --topbar-h / --tabbar-h variables.
 */
export function NotificationBell({ unread }: { unread: number }) {
  const { user } = useSession();
  const t = useT();
  const { message } = App.useApp();
  const pathname = usePathname();
  // The page the panel was opened on: any navigation (links, Back) closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const [armed, setArmed] = useState(false);
  const [marking, setMarking] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const headingId = useId();

  const preview = useMoodle<NotificationsResult>(
    "message_popup_get_popup_notifications",
    { useridto: user.id, newestfirst: 1, limit: PREVIEW, offset: 0 },
    !armed
  );
  const { reload: reloadPreview } = preview;

  // Refresh the loaded list when a page marks notifications read.
  useEffect(() => {
    if (!armed) return;
    window.addEventListener(NOTIFICATIONS_CHANGED, reloadPreview);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, reloadPreview);
  }, [armed, reloadPreview]);

  // Let the detail page open these instantly.
  useEffect(() => {
    if (preview.data) rememberNotifications(user.id, preview.data.notifications);
  }, [preview.data, user.id]);

  // Close on Escape (focus back on the bell) or on a click outside.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenOn(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenOn(null);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggle() {
    setOpenOn(open ? null : pathname);
    if (open) return;
    if (armed) reloadPreview();
    else setArmed(true);
  }

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

  const notifications = preview.data?.notifications ?? [];
  const close = () => setOpenOn(null);

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(e) => {
        // Tabbing past the last link closes the panel. A null target (a click
        // on non-focusable content) is left to the outside-click handler.
        const next = e.relatedTarget;
        if (open && next instanceof Node && !e.currentTarget.contains(next)) close();
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={
          unread > 0 ? t("notifications.bellUnread", { count: unread }) : t("nav.notifications")
        }
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={cn(
          "relative grid h-10 w-10 place-items-center rounded-xl bg-surface text-muted shadow-card ring-1 ring-line/60 transition hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:ring-line",
          "brand-bar:bg-white/12 brand-bar:text-white brand-bar:shadow-none brand-bar:ring-white/15 brand-bar:hover:text-white brand-bar:focus-visible:outline-white",
          open && "text-fg ring-line-strong brand-bar:text-white brand-bar:ring-white/40"
        )}
      >
        <Bell size={18} strokeWidth={1.85} />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none tabular-nums text-white ring-2 ring-canvas brand-bar:ring-sidebar"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headingId}
          className="fixed left-3 right-3 top-[calc(var(--topbar-h)+0.5rem)] z-50 flex max-h-[calc(100dvh-var(--topbar-h)-var(--tabbar-h)-1.5rem)] animate-fade-in flex-col overflow-hidden rounded-card border border-line/60 bg-surface shadow-pop sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[22rem] dark:border-line"
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-line py-2 pl-4 pr-2">
            <h2 id={headingId} className="py-2 text-[15px] font-extrabold text-fg">
              {t("nav.notifications")}
            </h2>
            {unread > 0 && (
              <Badge tone="danger" solid className="tabular-nums">
                {unread > 99 ? "99+" : unread}
              </Badge>
            )}
            {unread > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto"
                onClick={markAllRead}
                disabled={marking}
                aria-label={t("notifications.markAllRead")}
                title={t("notifications.markAllRead")}
              >
                {marking ? (
                  <Loader2 size={17} strokeWidth={1.85} className="animate-spin" />
                ) : (
                  <CheckCheck size={17} strokeWidth={1.85} />
                )}
              </Button>
            )}
          </div>

          <div className="max-h-[26rem] min-h-0 overflow-y-auto overscroll-contain p-1.5">
            {preview.error ? (
              <p role="alert" className="px-4 py-8 text-center text-[13px] text-error-text">
                {t("common.errorTitle")}
              </p>
            ) : !preview.data ? (
              <div role="status" aria-busy="true" className="space-y-1">
                <span className="sr-only">{t("common.loading")}</span>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3 p-2.5">
                    <Skeleton className="h-9 w-9 rounded-xl" />
                    <div className="flex-1 space-y-2 pt-0.5">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2.5 px-4 py-10 text-center">
                <IconTile icon={BellOff} tone="primary" />
                <p className="text-sm font-semibold text-fg">{t("notifications.allCaughtUp")}</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {notifications.map((n) => (
                  <li key={`${n.id}-${n.timecreated}`}>
                    <NotificationItem n={n} compact onNavigate={close} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            href="/notifications"
            onClick={close}
            className="flex shrink-0 items-center justify-center gap-1.5 border-t border-line px-4 py-3 text-[13px] font-bold text-primary-text transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
          >
            {t("notifications.viewAll")}
            <ArrowRight size={14} strokeWidth={2} />
          </Link>
        </div>
      )}
    </div>
  );
}
