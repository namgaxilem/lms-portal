"use client";
import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { App } from "antd";
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  Search,
  SendHorizontal,
} from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { moodleClient, useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { UserAvatar } from "@/components/UserAvatar";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Skeleton,
  cn,
  inputClass,
} from "@/components/ui";
import { isToday, stripHtml, timeAgo } from "@/lib/format";
import type {
  ConversationMessagesResult,
  ConversationsResult,
  UserProfile,
} from "@/lib/moodle/types";

function dayKey(unix: number) {
  return new Date(unix * 1000).toDateString();
}

function clockTime(unix: number) {
  return new Date(unix * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Conversation list + thread. With no `targetUserId` it shows the list and a
 * placeholder (clicking a conversation navigates to /messages/{userId}). With a
 * `targetUserId` the matching conversation opens — or, if none exists yet, an
 * empty thread ready to start a new chat with that person.
 */
export function MessagesView({ targetUserId }: { targetUserId?: number }) {
  const { user } = useSession();
  const t = useT();
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("");

  const convs = useMoodle<ConversationsResult>(
    "core_message_get_conversations",
    { userid: user.id, limitfrom: 0, limitnum: 50 }
  );
  const conversations = convs.data?.conversations ?? [];

  const existing =
    targetUserId != null
      ? conversations.find((c) => c.members.some((m) => m.id === targetUserId))
      : undefined;
  const activeConvId = existing?.id ?? null;

  // Fetch the target's profile only when we have no existing conversation to
  // pull their name from (i.e. a brand-new chat).
  const profile = useMoodle<UserProfile[]>(
    "core_user_get_users_by_field",
    { field: "id", values: targetUserId != null ? [targetUserId] : [] },
    targetUserId == null || convs.loading || !!existing
  );

  const recipient =
    existing?.members.find((m) => m.id === targetUserId) ??
    (profile.data?.[0]
      ? {
          id: targetUserId!,
          fullname: profile.data[0].fullname,
          profileimageurl: profile.data[0].profileimageurl ?? "",
        }
      : undefined);

  const thread = useMoodle<ConversationMessagesResult>(
    "core_message_get_conversation_messages",
    {
      currentuserid: user.id,
      convid: activeConvId ?? 0,
      limitfrom: 0,
      limitnum: 100,
      newest: 0,
    },
    activeConvId === null
  );

  async function send() {
    if (!draft.trim() || !recipient) return;
    setSending(true);
    try {
      await moodleClient("core_message_send_instant_messages", {
        messages: [{ touserid: recipient.id, text: draft.trim() }],
      });
      setDraft("");
      convs.reload();
      if (activeConvId !== null) thread.reload();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  const messages = thread.data?.messages ?? [];
  const q = filter.trim().toLowerCase();

  const rows = conversations
    .map((c) => {
      const other = c.members.find((m) => m.id !== user.id);
      const title = c.name || other?.fullname || t("messages.conversation");
      return { c, other, title };
    })
    .filter((r) => !q || r.title.toLowerCase().includes(q));

  return (
    <Card className="grid h-[calc(100vh-10rem)] min-h-[520px] grid-cols-1 overflow-hidden md:grid-cols-[300px_1fr]">
      {/* Conversation list */}
      <div
        className={cn(
          "min-h-0 flex-col border-line md:border-r",
          targetUserId != null ? "hidden md:flex" : "flex"
        )}
      >
        <div className="space-y-3 border-b border-line p-4">
          <h1 className="text-base font-semibold text-fg">{t("nav.messages")}</h1>
          <Input
            icon={Search}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("common.filter")}
            aria-label={t("common.filter")}
            className="h-9"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {convs.loading ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              compact
              icon={MessageCircle}
              title={t("messages.noConversations")}
            />
          ) : (
            <ul className="space-y-0.5 p-2">
              {rows.map(({ c, other, title }) => {
                const isActive =
                  c.id === activeConvId || (!!other && other.id === targetUserId);
                const last = c.messages[0];
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/messages/${other?.id ?? c.id}`)}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors",
                        isActive ? "bg-surface-2" : "hover:bg-surface-2"
                      )}
                    >
                      <UserAvatar
                        name={title}
                        id={other?.id ?? c.id}
                        src={other?.profileimageurl || undefined}
                        size={36}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-medium text-fg">
                            {title}
                          </p>
                          {last && (
                            <span className="shrink-0 text-2xs tabular-nums text-subtle">
                              {timeAgo(last.timecreated)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="line-clamp-1 text-[13px] text-subtle">
                            {last ? stripHtml(last.text) : "—"}
                          </p>
                          {c.unreadcount ? (
                            <Badge
                              tone="primary"
                              className="h-5 shrink-0 px-1.5 tabular-nums"
                            >
                              {c.unreadcount}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Thread */}
      <div
        className={cn(
          "min-h-0 flex-col",
          targetUserId == null ? "hidden md:flex" : "flex"
        )}
      >
        {targetUserId == null ? (
          <div className="flex flex-1 items-center justify-center bg-canvas">
            <EmptyState
              icon={MessageCircle}
              title={
                !convs.loading && conversations.length === 0
                  ? t("messages.noConversations")
                  : t("messages.selectConversation")
              }
            />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4">
              <Button
                variant="ghost"
                size="icon-sm"
                className="-ml-1.5 md:hidden"
                onClick={() => router.push("/messages")}
                aria-label={t("common.back")}
              >
                <ArrowLeft size={18} strokeWidth={1.75} />
              </Button>
              <UserAvatar
                name={recipient?.fullname ?? "?"}
                id={recipient?.id ?? 0}
                src={recipient?.profileimageurl || undefined}
                size={32}
              />
              <h2 className="truncate text-sm font-semibold text-fg">
                {recipient?.fullname ??
                  (convs.loading || profile.loading
                    ? t("common.loading")
                    : t("messages.conversation"))}
              </h2>
            </div>

            {/* Messages — column-reverse keeps the view pinned to the newest */}
            <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto bg-canvas px-4 py-5">
              {thread.loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-9 w-1/2 rounded-2xl" />
                  <Skeleton className="ml-auto h-9 w-2/5 rounded-2xl" />
                  <Skeleton className="h-9 w-1/3 rounded-2xl" />
                </div>
              ) : messages.length === 0 ? (
                <div className="m-auto">
                  <EmptyState
                    compact
                    icon={MessageCircle}
                    title={t("messages.startConversation")}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {messages.map((m, i) => {
                    const mine = m.useridfrom === user.id;
                    const newDay =
                      i === 0 ||
                      dayKey(messages[i - 1].timecreated) !== dayKey(m.timecreated);
                    return (
                      <Fragment key={m.id}>
                        {newDay && (
                          <div className="my-3 flex items-center gap-3 text-2xs font-medium text-subtle">
                            <span className="h-px flex-1 bg-line" />
                            {isToday(m.timecreated)
                              ? t("common.today")
                              : new Date(m.timecreated * 1000).toLocaleDateString()}
                            <span className="h-px flex-1 bg-line" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "flex max-w-[75%] flex-col",
                            mine ? "ml-auto items-end" : "items-start"
                          )}
                        >
                          <div
                            className={cn(
                              "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm",
                              mine
                                ? "rounded-br-md bg-primary text-primary-fg"
                                : "rounded-bl-md border border-line bg-surface text-fg"
                            )}
                          >
                            {stripHtml(m.text)}
                          </div>
                          <span className="mt-0.5 px-1 text-2xs tabular-nums text-subtle">
                            {clockTime(m.timecreated)}
                          </span>
                        </div>
                      </Fragment>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Composer */}
            <form
              className="flex shrink-0 items-center gap-2 border-t border-line p-3"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  recipient
                    ? t("messages.placeholder", { name: recipient.fullname })
                    : t("messages.typeMessage")
                }
                aria-label={t("messages.typeMessage")}
                className={cn(inputClass, "flex-1")}
              />
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10"
                disabled={!recipient || !draft.trim() || sending}
                aria-label={t("messages.send")}
              >
                {sending ? (
                  <Loader2 size={18} strokeWidth={1.75} className="animate-spin" />
                ) : (
                  <SendHorizontal size={18} strokeWidth={1.75} />
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </Card>
  );
}
