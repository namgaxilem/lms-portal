"use client";
import { MessagesSquare } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useT } from "@/i18n/I18nProvider";
import { Card, IconTile, PageHeader, Skeleton, cn } from "@/components/ui";
import { useVisibleInterval } from "@/lib/browser-hooks";
import { ConversationList } from "./ConversationList";
import { targetKey } from "./lib";
import { ThreadPane } from "./ThreadPane";
import { CONVERSATION_TYPE, type MessageTarget } from "./types";
import { useConversations } from "./useConversations";
import { useConversationTarget } from "./useConversationTarget";

const LIST_POLL_MS = 60_000;

/**
 * Messaging: page header, then conversation list + thread side by side from
 * md up. On phones the list (/messages) and the thread (/messages/{userId},
 * /messages/conversation/{id}) are separate screens: the list scrolls with
 * the page, the thread fills the screen with a back button instead of the
 * header. /messages/{own id} opens the personal notes space.
 */
export function MessagesView({ target }: { target?: MessageTarget }) {
  const { user } = useSession();
  const t = useT();
  const convs = useConversations(user.id);
  const resolution = useConversationTarget(user.id, target);
  useVisibleInterval(convs.refresh, LIST_POLL_MS);

  const activeId = resolution.data?.conversation?.id ?? null;
  const listUnread = convs.conversations.find((c) => c.id === activeId)?.unreadcount ?? 0;
  // Conversations, not messages, so it matches the sidebar badge (unread conversations count).
  const unreadChats = convs.conversations.filter(
    (c) => c.type !== CONVERSATION_TYPE.self && (c.unreadcount ?? 0) > 0
  ).length;

  return (
    <div
      className={cn(
        "flex flex-col",
        // Fill the space between the shell's top bar and tab bar, less main's own padding
        // (1.5rem top + 3rem bottom; 2rem + 3rem from lg).
        target
          ? "h-[calc(100dvh-var(--topbar-h)-var(--tabbar-h)-4.5rem)] min-h-[18rem]"
          : "md:h-[calc(100dvh-var(--topbar-h)-var(--tabbar-h)-4.5rem)] md:min-h-[18rem]",
        "lg:h-[calc(100dvh-var(--topbar-h)-var(--tabbar-h)-5rem)] lg:min-h-[30rem]"
      )}
    >
      <div className={cn("shrink-0", target && "hidden md:block")}>
        <PageHeader
          title={t("nav.messages")}
          description={
            convs.loading ? (
              <Skeleton className="h-5 w-44" />
            ) : convs.error ? undefined : unreadChats > 0 ? (
              t("messages.unreadConversations", { count: unreadChats })
            ) : (
              t("messages.noneUnread")
            )
          }
        />
      </div>

      <Card className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className={cn("min-h-0 flex-col border-line bg-surface md:border-r", target ? "hidden md:flex" : "flex")}>
          <ConversationList convs={convs} target={target} activeConversationId={activeId} />
        </div>

        <div className={cn("min-h-0 min-w-0 flex-col", target ? "flex" : "hidden md:flex")}>
          {target ? (
            <ThreadPane
              key={targetKey(target)}
              target={target}
              resolution={resolution}
              listUnread={listUnread}
              onConversationsChanged={convs.refresh}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-canvas p-8 text-center">
              <IconTile icon={MessagesSquare} tone="primary" solid size="lg" />
              <div>
                <p className="text-lg font-extrabold text-fg">{t("messages.selectConversation")}</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{t("messages.selectHint")}</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
