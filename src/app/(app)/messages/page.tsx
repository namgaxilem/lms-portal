"use client";
import { useState } from "react";
import { App } from "antd";
import { useSession } from "@/components/providers/SessionProvider";
import { moodleClient, useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { MaterialIcon } from "@/components/MaterialIcon";
import type {
  ConversationMessagesResult,
  ConversationsResult,
} from "@/lib/moodle/types";

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").trim();
}

const AVATAR_COLORS = [
  "bg-primary-container text-on-primary",
  "bg-secondary-container text-on-secondary-container",
  "bg-tertiary-container text-on-tertiary-container",
];

function Avatar({ name, id, size = 12 }: { name: string; id: number; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${AVATAR_COLORS[id % AVATAR_COLORS.length]}`}
      style={{ width: size * 4, height: size * 4 }}
    >
      {initials}
    </div>
  );
}

export default function MessagesPage() {
  const { user } = useSession();
  const t = useT();
  const { message } = App.useApp();
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const convs = useMoodle<ConversationsResult>(
    "core_message_get_conversations",
    { userid: user.id, limitfrom: 0, limitnum: 50 }
  );
  const thread = useMoodle<ConversationMessagesResult>(
    "core_message_get_conversation_messages",
    { currentuserid: user.id, convid: activeConv ?? 0, limitfrom: 0, limitnum: 100, newest: 0 },
    activeConv === null
  );

  const conversations = convs.data?.conversations ?? [];
  const active = conversations.find((c) => c.id === activeConv);
  const recipient = active?.members.find((m) => m.id !== user.id);

  async function send() {
    if (!draft.trim() || !recipient) return;
    setSending(true);
    try {
      await moodleClient("core_message_send_instant_messages", {
        messages: [{ touserid: recipient.id, text: draft.trim() }],
      });
      setDraft("");
      thread.reload();
      convs.reload();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

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
            activeConv !== null ? "hidden md:flex" : "flex"
          }`}
        >
          {convs.loading ? (
            <div className="p-6 text-center font-body-sm text-body-sm text-on-surface-variant">
              {t("common.loading")}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <MaterialIcon name="chat_bubble" className="!text-4xl text-outline-variant" />
              <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
                {t("messages.noConversations")}
              </p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {conversations.map((c) => {
                const other = c.members.find((m) => m.id !== user.id);
                const title = c.name || other?.fullname || t("messages.conversation");
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveConv(c.id)}
                    className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${
                      c.id === activeConv
                        ? "border-l-4 border-primary bg-primary-container/10"
                        : "hover:bg-surface-container"
                    }`}
                  >
                    <Avatar name={title} id={other?.id ?? c.id} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="truncate font-body-md font-semibold text-on-surface">
                          {title}
                        </h3>
                      </div>
                      <p className="truncate font-body-sm text-body-sm text-on-surface-variant">
                        {c.messages[0] ? stripHtml(c.messages[0].text).slice(0, 40) : "—"}
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
        <div className={`flex-col bg-surface-container-low/30 ${activeConv === null ? "hidden md:flex" : "flex"}`}>
          {activeConv === null ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <MaterialIcon name="mark_unread_chat_alt" className="!text-5xl text-outline-variant" />
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
                  onClick={() => setActiveConv(null)}
                >
                  <MaterialIcon name="arrow_back" />
                </button>
                <Avatar name={recipient?.fullname ?? "?"} id={recipient?.id ?? 0} size={9} />
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">
                    {recipient?.fullname ?? active?.name ?? t("messages.conversation")}
                  </h3>
                </div>
              </div>

              {/* Canvas */}
              <div className="flex flex-1 flex-col-reverse gap-3 overflow-y-auto p-gutter">
                {thread.loading ? (
                  <div className="text-center font-body-sm text-body-sm text-on-surface-variant">
                    {t("common.loading")}
                  </div>
                ) : (
                  (thread.data?.messages ?? [])
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
                    <MaterialIcon name={sending ? "progress_activity" : "send"} className={sending ? "animate-spin" : ""} />
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
