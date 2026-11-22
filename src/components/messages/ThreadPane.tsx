"use client";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { App } from "antd";
import { AlertCircle, ArrowLeft, Ban, ChevronUp, Loader2, MessageCircle, UserX } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useT } from "@/i18n/I18nProvider";
import { moodleClient } from "@/lib/client-api";
import { useSiteFunctions } from "@/lib/moodle/hooks";
import { notifyMessagesChanged } from "@/lib/notifications";
import { Button, EmptyState, Skeleton } from "@/components/ui";
import { useVisibleInterval } from "@/lib/browser-hooks";
import { Composer } from "./Composer";
import { ConversationAvatar } from "./ConversationAvatar";
import { MessageList } from "./MessageList";
import { MESSAGE_MAX_BYTES, byteLength, describeThread } from "./lib";
import {
  CONVERSATION_TYPE,
  type InstantMessageResult,
  type MessageTarget,
  type ThreadMessage,
} from "./types";
import type { useConversationTarget } from "./useConversationTarget";
import { useThreadMessages } from "./useThreadMessages";

const POLL_MS = 15_000;

type Blocker = "deleted" | "blocked" | "contacts" | "cannot";

const BLOCKER_KEY: Record<Blocker, string> = {
  deleted: "messages.blockedDeleted",
  blocked: "messages.blockedByYou",
  contacts: "messages.contactsOnly",
  cannot: "messages.cannotMessage",
};

/**
 * Right pane: header, the message thread and the composer. Existing
 * conversations (including the personal notes space, which instant messages
 * cannot reach) take messages by conversation id; a first message to someone
 * goes through send_instant_messages, whose per-message result is checked.
 */
export function ThreadPane({
  target,
  resolution,
  listUnread,
  onConversationsChanged,
}: {
  target: MessageTarget;
  resolution: ReturnType<typeof useConversationTarget>;
  /** Unread count the conversation list shows for this chat (may be fresher than the lookup). */
  listUnread: number;
  /** The conversation list should re-read (sent a message, marked read). */
  onConversationsChanged: () => void;
}) {
  const { user } = useSession();
  const t = useT();
  const { message } = App.useApp();
  const site = useSiteFunctions();
  const [startedId, setStartedId] = useState<number | null>(null);

  const isSelf = target.kind === "user" && target.userId === user.id;
  const conversation = resolution.data?.conversation ?? null;
  const recipient = resolution.data?.recipient ?? null;
  const conversationId = conversation?.id ?? startedId;
  const isGroup = conversation?.type === CONVERSATION_TYPE.group;
  const canMarkRead = site.has("core_message_mark_all_conversation_messages_as_read") === true;

  async function markRead(id: number) {
    if (!canMarkRead) return;
    try {
      await moodleClient("core_message_mark_all_conversation_messages_as_read", {
        userid: user.id,
        conversationid: id,
      });
      notifyMessagesChanged();
      onConversationsChanged();
    } catch {
      /* The unread badge simply stays until the next visit. */
    }
  }

  const thread = useThreadMessages(user.id, conversationId, () => {
    if (conversationId) void markRead(conversationId);
  });
  useVisibleInterval(thread.poll, POLL_MS, thread.ready);

  // Opening a conversation with unread messages marks them read once shown.
  const hasUnread = (conversation?.unreadcount ?? 0) > 0 || listUnread > 0;
  const markOpened = useEffectEvent((id: number) => void markRead(id));
  useEffect(() => {
    if (conversationId && thread.ready && hasUnread && canMarkRead) markOpened(conversationId);
  }, [conversationId, thread.ready, hasUnread, canMarkRead]);

  // In 1:1 chats the other person may not have sent anything in the loaded page.
  const members = useMemo(
    () => (recipient ? { [recipient.id]: recipient, ...thread.members } : thread.members),
    [recipient, thread.members]
  );

  const { avatar, title, subtitle } = describeThread({ isSelf, conversation, recipient }, t);

  const blocker: Blocker | null =
    isSelf || isGroup || !recipient
      ? null
      : recipient.isdeleted
        ? "deleted"
        : recipient.isblocked
          ? "blocked"
          : recipient.canmessage === false
            ? recipient.requirescontact
              ? "contacts"
              : "cannot"
            : null;
  const notFound = !resolution.loading && !resolution.error && !conversation && !recipient;

  async function send(text: string) {
    if (byteLength(text) > MESSAGE_MAX_BYTES) {
      message.error(t("messages.tooLong"));
      return false;
    }
    try {
      if (conversationId) {
        const sent = await moodleClient<ThreadMessage[]>("core_message_send_messages_to_conversation", {
          conversationid: conversationId,
          messages: [{ text }],
        });
        thread.append(sent ?? []);
      } else if (recipient) {
        // Moodle reports refusals (contacts only, blocked…) as msgid -1, not as an error.
        const [result] = await moodleClient<InstantMessageResult[]>("core_message_send_instant_messages", {
          messages: [{ touserid: recipient.id, text }],
        });
        if (!result || result.msgid < 0) throw new Error(result?.errormessage || t("messages.sendFailed"));
        if (result.conversationid) setStartedId(result.conversationid);
        else resolution.retry();
      } else {
        return false;
      }
      onConversationsChanged();
      return true;
    } catch (e) {
      message.error((e as Error).message);
      return false;
    }
  }

  async function loadOlder() {
    try {
      await thread.loadOlder();
    } catch (e) {
      message.error((e as Error).message);
    }
  }

  return (
    <>
      <h1 className="sr-only md:hidden">{t("nav.messages")}</h1>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-5">
        <Button variant="ghost" size="icon" href="/messages" className="-ml-1.5 md:hidden" aria-label={t("common.back")}>
          <ArrowLeft size={18} strokeWidth={1.85} />
        </Button>
        {resolution.loading ? (
          <>
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </>
        ) : (
          <>
            {avatar && <ConversationAvatar avatar={avatar} size="sm" showOnline />}
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-extrabold text-fg">{title}</h2>
              {subtitle && <p className="truncate text-xs text-subtle">{subtitle}</p>}
            </div>
          </>
        )}
      </header>

      {resolution.error ? (
        <CenterState>
          <EmptyState
            compact
            icon={AlertCircle}
            title={t("common.errorTitle")}
            hint={resolution.error}
            action={
              <Button variant="secondary" size="sm" onClick={resolution.retry}>
                {t("common.retry")}
              </Button>
            }
          />
        </CenterState>
      ) : notFound ? (
        <CenterState>
          <EmptyState
            compact
            icon={UserX}
            title={t("messages.notFound")}
            action={
              <Button variant="secondary" size="sm" href="/messages">
                {t("common.back")}
              </Button>
            }
          />
        </CenterState>
      ) : resolution.loading || thread.loading ? (
        <ThreadSkeleton />
      ) : thread.error ? (
        <CenterState>
          <EmptyState
            compact
            icon={AlertCircle}
            title={t("common.errorTitle")}
            hint={thread.error}
            action={
              <Button variant="secondary" size="sm" onClick={thread.reload}>
                {t("common.retry")}
              </Button>
            }
          />
        </CenterState>
      ) : thread.messages.length === 0 ? (
        <CenterState>
          <div className="flex flex-col items-center gap-3 text-center">
            {avatar ? <ConversationAvatar avatar={avatar} size="lg" /> : <MessageCircle size={32} aria-hidden />}
            <div>
              <p className="text-base font-extrabold text-fg">{title}</p>
              <p className="mx-auto mt-1 max-w-xs text-[13px] text-muted">
                {isSelf ? t("messages.selfIntro") : t("messages.startConversation")}
              </p>
            </div>
          </div>
        </CenterState>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto bg-canvas">
          <div role="log" aria-label={title} className="flex flex-col px-3 py-4 sm:px-6">
            {thread.hasOlder && (
              <div className="mb-4 flex justify-center">
                <Button variant="secondary" size="sm" onClick={loadOlder} disabled={thread.loadingOlder}>
                  {thread.loadingOlder ? (
                    <Loader2 size={15} strokeWidth={1.85} className="animate-spin" />
                  ) : (
                    <ChevronUp size={15} strokeWidth={1.85} />
                  )}
                  {t("messages.loadOlder")}
                </Button>
              </div>
            )}
            <MessageList messages={thread.messages} members={members} isGroup={isGroup} />
          </div>
        </div>
      )}

      {blocker ? (
        <p className="flex shrink-0 items-center gap-2.5 border-t border-line bg-surface px-4 py-3.5 text-[13px] text-muted">
          <Ban size={16} strokeWidth={1.85} className="shrink-0 text-error-text" aria-hidden />
          {t(BLOCKER_KEY[blocker], { name: recipient?.fullname ?? "" })}
        </p>
      ) : (
        !notFound &&
        !resolution.error && (
          <Composer
            placeholder={
              isSelf
                ? t("messages.selfPlaceholder")
                : t("messages.placeholder", { name: title })
            }
            // A sent message is shown by adding it to the loaded thread, so wait for it.
            disabled={resolution.loading || thread.loading || !!thread.error || (!conversationId && !recipient)}
            onSend={send}
          />
        )
      )}
    </>
  );
}

function CenterState({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-canvas p-6">{children}</div>;
}

function ThreadSkeleton() {
  const t = useT();
  return (
    <div role="status" aria-busy="true" className="flex min-h-0 flex-1 flex-col justify-end gap-3 bg-canvas px-4 py-5 sm:px-6">
      <span className="sr-only">{t("common.loading")}</span>
      <Skeleton className="h-10 w-1/2 rounded-3xl" />
      <Skeleton className="ml-auto h-10 w-2/5 rounded-3xl" />
      <Skeleton className="h-14 w-3/5 rounded-3xl" />
      <Skeleton className="ml-auto h-10 w-1/3 rounded-3xl" />
    </div>
  );
}
