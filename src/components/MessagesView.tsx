"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { App } from "antd";
import { useSession } from "@/components/providers/SessionProvider";
import { moodleClient, useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { MaterialIcon } from "@/components/MaterialIcon";
import { UserAvatar } from "@/components/UserAvatar";
import type {
  ConversationMessagesResult,
  ConversationsResult,
  UserProfile,
} from "@/lib/moodle/types";

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").trim();
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
      ? { id: targetUserId!, fullname: profile.data[0].fullname }
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

  return (
    <div className="space-y-gutter">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container/10 text-primary">
          <MaterialIcon name="forum" fill />
        </div>
        <h2 className="font-headline-md text-headline-md text-on-surface">
          {t("nav.messages")}
        </h2>
      </div>

      <div className="grid h-[72vh] grid-cols-1 overflow-hidden rounded-xl bg-surface-container-lowest card-elevation md:grid-cols-[320px_1fr]">
        {/* Conversation list */}
        <div
          className={`flex-col overflow-y-auto border-r border-outline-variant/30 ${
            targetUserId != null ? "hidden md:flex" : "flex"
          }`}
        >
          {convs.loading ? (
            <div className="p-6 text-center font-body-sm text-body-sm text-on-surface-variant">
              {t("common.loading")}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <MaterialIcon
                name="chat_bubble"
                className="!text-4xl text-outline-variant"
              />
              <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
                {t("messages.noConversations")}
              </p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {conversations.map((c) => {
                const other = c.members.find((m) => m.id !== user.id);
                const title =
                  c.name || other?.fullname || t("messages.conversation");
                const isActive =
                  c.id === activeConvId ||
                  (!!other && other.id === targetUserId);
                return (
                  <button
                    key={c.id}
                    onClick={() =>
                      router.push(`/messages/${other?.id ?? c.id}`)
                    }
                    className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${
                      isActive
                        ? "bg-primary-container/10"
                        : "hover:bg-surface-container"
                    }`}
                  >
                    <UserAvatar name={title} id={other?.id ?? c.id} size={44} />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-body-md font-semibold text-on-surface">
                        {title}
                      </h3>
                      <p className="truncate font-body-sm text-body-sm text-on-surface-variant">
                        {c.messages[0]
                          ? stripHtml(c.messages[0].text).slice(0, 40)
                          : "—"}
                      </p>
                    </div>
                    {c.unreadcount ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-on-primary">
                        {c.unreadcount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Thread */}
        <div
          className={`flex-col bg-surface-container-low/30 ${
            targetUserId == null ? "hidden md:flex" : "flex"
          }`}
        >
          {targetUserId == null ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <MaterialIcon
                name="mark_unread_chat_alt"
                className="!text-5xl text-outline-variant"
              />
              <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
                {t("messages.selectConversation")}
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-outline-variant/30 bg-surface px-gutter py-3">
                <button
                  className="text-on-surface-variant md:hidden"
                  onClick={() => router.push("/messages")}
                  aria-label={t("scorm.back")}
                >
                  <MaterialIcon name="arrow_back" />
                </button>
                <UserAvatar
                  name={recipient?.fullname ?? "?"}
                  id={recipient?.id ?? 0}
                  size={36}
                />
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  {recipient?.fullname ??
                    (convs.loading || profile.loading
                      ? t("common.loading")
                      : t("messages.conversation"))}
                </h3>
              </div>

              {/* Canvas */}
              <div className="flex flex-1 flex-col-reverse gap-3 overflow-y-auto p-gutter">
                {thread.loading ? (
                  <div className="text-center font-body-sm text-body-sm text-on-surface-variant">
                    {t("common.loading")}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="m-auto text-center font-body-sm text-body-sm text-on-surface-variant">
                    {t("messages.startConversation")}
                  </div>
                ) : (
                  messages
                    .slice()
                    .reverse()
                    .map((m) => {
                      const mine = m.useridfrom === user.id;
                      return (
                        <div
                          key={m.id}
                          className={`max-w-[78%] animate-fade-in-up px-4 py-2.5 font-body-sm text-body-sm shadow-sm ${
                            mine
                              ? "self-end rounded-2xl rounded-br-sm bg-primary text-on-primary"
                              : "self-start rounded-2xl rounded-bl-sm bg-surface-container-high text-on-surface"
                          }`}
                        >
                          {stripHtml(m.text)}
                        </div>
                      );
                    })
                )}
              </div>

              {/* Composer */}
              <div className="border-t border-outline-variant/30 bg-surface p-3">
                <div className="flex items-center gap-2 rounded-xl border border-transparent bg-surface-container-low px-3 py-1.5 transition-all focus-within:border-primary focus-within:bg-white">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder={
                      recipient
                        ? t("messages.placeholder", { name: recipient.fullname })
                        : t("messages.typeMessage")
                    }
                    className="flex-grow border-none bg-transparent py-2 font-body-sm text-body-sm outline-none"
                  />
                  <button
                    onClick={send}
                    disabled={!recipient || !draft.trim() || sending}
                    aria-label={t("messages.send")}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-on-primary transition-transform hover:bg-primary-container active:scale-95 disabled:opacity-50"
                  >
                    <MaterialIcon
                      name={sending ? "progress_activity" : "send"}
                      className={sending ? "animate-spin" : ""}
                    />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
