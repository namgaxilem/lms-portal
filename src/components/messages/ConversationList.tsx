"use client";
import { useState } from "react";
import Link from "next/link";
import { App } from "antd";
import { ChevronDown, Loader2, MessageCircle, Search, SearchX } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Button, EmptyState, Input, QueryState, Skeleton, cn } from "@/components/ui";
import { foldSearch, plainText, timeAgo } from "@/lib/format";
import { ConversationAvatar } from "./ConversationAvatar";
import { conversationTitle, describeConversation, sameTarget, type ConversationView } from "./lib";
import { CONVERSATION_TYPE, type MessageTarget } from "./types";
import type { useConversations } from "./useConversations";

/**
 * Left pane: an accent-insensitive filter, the personal notes space pinned
 * first, then conversations by latest message.
 */
export function ConversationList({
  convs,
  target,
  activeConversationId,
}: {
  convs: ReturnType<typeof useConversations>;
  target?: MessageTarget;
  activeConversationId: number | null;
}) {
  const { user } = useSession();
  const t = useT();
  const { message } = App.useApp();
  const [filter, setFilter] = useState("");

  const views = convs.conversations.map((c) => describeConversation(c, user));
  // Pinned even when Moodle has not created it yet or it is beyond the loaded page.
  const selfView =
    views.find((v) => v.avatar.kind === "self") ??
    describeConversation(
      { id: 0, name: null, type: CONVERSATION_TYPE.self, unreadcount: null, members: [], messages: [] },
      user
    );
  const rows = [selfView, ...views.filter((v) => v.avatar.kind !== "self")];

  const q = foldSearch(filter);
  const shown = q ? rows.filter((v) => foldSearch(conversationTitle(v, t)).includes(q)) : rows;

  async function loadMore() {
    try {
      await convs.loadMore();
    } catch (e) {
      message.error((e as Error).message);
    }
  }

  return (
    <>
      <div className="border-b border-line p-3 sm:p-4">
        <Input
          icon={Search}
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("messages.filterPlaceholder")}
          aria-label={t("messages.filterPlaceholder")}
          className="h-10"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <QueryState loading={convs.loading} error={convs.error} skeleton={<ListSkeleton />}>
          {shown.length === 0 ? (
            <EmptyState
              compact
              icon={q ? SearchX : MessageCircle}
              title={q ? t("messages.noMatches", { q: filter.trim() }) : t("messages.noConversations")}
            />
          ) : (
            <ul className="space-y-0.5">
              {shown.map((v) => (
                <li key={v.avatar.kind === "self" ? "self" : v.id}>
                  <ConversationRow
                    view={v}
                    active={(v.id > 0 && v.id === activeConversationId) || sameTarget(v.target, target)}
                  />
                </li>
              ))}
            </ul>
          )}
          {convs.hasMore && !q && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full"
              onClick={loadMore}
              disabled={convs.loadingMore}
            >
              {convs.loadingMore ? (
                <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
              ) : (
                <ChevronDown size={16} strokeWidth={1.75} />
              )}
              {t("messages.loadMore")}
            </Button>
          )}
        </QueryState>
      </div>
    </>
  );
}

function ConversationRow({ view, active }: { view: ConversationView; active: boolean }) {
  const { user } = useSession();
  const t = useT();
  const { locale } = useLocale();
  const self = view.avatar.kind === "self";
  const unread = view.unread > 0;
  const last = view.last;
  const preview = last
    ? `${!self && last.useridfrom === user.id ? `${t("messages.you")}: ` : ""}${plainText(last.text)}`
    : self
      ? t("messages.selfHint")
      : t("messages.noMessages");

  return (
    <Link
      href={view.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-2.5 py-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
        active ? "bg-primary-soft" : "hover:bg-surface-2"
      )}
    >
      <ConversationAvatar avatar={view.avatar} highlight={unread} showOnline />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={cn(
              "truncate text-sm",
              unread ? "font-extrabold" : "font-semibold",
              active ? "text-primary-text" : "text-fg"
            )}
          >
            {conversationTitle(view, t)}
          </p>
          {last && (
            <time
              dateTime={new Date(last.timecreated * 1000).toISOString()}
              className={cn(
                "shrink-0 text-2xs tabular-nums",
                unread ? "font-bold text-primary-text" : "text-subtle"
              )}
            >
              {timeAgo(last.timecreated, locale)}
            </time>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className={cn("line-clamp-1 text-[13px]", unread ? "font-semibold text-fg" : "text-subtle")}>
            {preview}
          </p>
          {unread && (
            <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold tabular-nums text-primary-fg">
              <span aria-hidden>{view.unread > 99 ? "99+" : view.unread}</span>
              <span className="sr-only">{t("messages.unreadMessages", { count: view.unread })}</span>
            </span>
          )}
        </div>
        {view.subtitle && <p className="truncate text-2xs text-subtle">{view.subtitle}</p>}
      </div>
    </Link>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2.5">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
