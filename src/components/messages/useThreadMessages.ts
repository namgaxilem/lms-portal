"use client";
import { useCallback, useEffect, useState } from "react";
import { moodleClient } from "@/lib/client-api";
import { mergeMessages } from "./lib";
import type { ConversationMember, ConversationMessagesPage, ThreadMessage } from "./types";

const PAGE = 30;

interface Thread {
  conversationId: number;
  /** Oldest first. */
  messages: ThreadMessage[];
  /** Senders seen so far (names and pictures for group chats). */
  members: Record<number, ConversationMember>;
  hasOlder: boolean;
}

function withMembers(current: Record<number, ConversationMember>, members: ConversationMember[]) {
  const next = { ...current };
  for (const m of members) next[m.id] = m;
  return next;
}

/**
 * Messages of one conversation: the newest page first (Moodle's `newest`
 * flag), older pages on demand, and new messages since the last one
 * (`timefrom`) when polled. `onIncoming` fires when a poll brings messages
 * from someone else.
 */
export function useThreadMessages(
  userId: number,
  conversationId: number | null,
  onIncoming?: () => void
) {
  const [thread, setThread] = useState<Thread | null>(null);
  /** Bumped by `reload` to fetch the first page again after an error. */
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<{ conversationId: number; attempt: number; message: string } | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const fetchPage = useCallback(
    (convid: number, args: { limitfrom?: number; timefrom?: number }) =>
      moodleClient<ConversationMessagesPage>("core_message_get_conversation_messages", {
        currentuserid: userId,
        convid,
        limitnum: PAGE,
        newest: true,
        limitfrom: 0,
        ...args,
      }),
    [userId]
  );

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    fetchPage(conversationId, {}).then(
      (page) =>
        !cancelled &&
        setThread({
          conversationId,
          messages: mergeMessages([], page.messages),
          members: withMembers({}, page.members),
          hasOlder: page.messages.length === PAGE,
        }),
      (e: Error) => !cancelled && setError({ conversationId, attempt, message: e.message })
    );
    return () => {
      cancelled = true;
    };
  }, [conversationId, fetchPage, attempt]);

  const current = thread && thread.conversationId === conversationId ? thread : null;
  const failed = !current && error?.conversationId === conversationId && error.attempt === attempt;

  const add = useCallback((convid: number, page: Pick<ConversationMessagesPage, "messages" | "members">, older?: boolean) => {
    setThread((t) =>
      t && t.conversationId === convid
        ? {
            ...t,
            messages: mergeMessages(t.messages, page.messages),
            members: withMembers(t.members, page.members),
            hasOlder: older ? page.messages.length === PAGE : t.hasOlder,
          }
        : t
    );
  }, []);

  /** Loads the previous page; throws so the caller can report the failure. */
  async function loadOlder() {
    if (!current || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await fetchPage(current.conversationId, { limitfrom: current.messages.length });
      add(current.conversationId, page, true);
    } finally {
      setLoadingOlder(false);
    }
  }

  /** Fetches messages newer than the last one shown. Failures wait for the next poll. */
  async function poll() {
    if (!current) return;
    const last = current.messages[current.messages.length - 1];
    try {
      const page = await fetchPage(current.conversationId, last ? { timefrom: last.timecreated } : {});
      const known = new Set(current.messages.map((m) => m.id));
      const fresh = page.messages.filter((m) => !known.has(m.id));
      if (fresh.length === 0) return;
      add(current.conversationId, page);
      if (fresh.some((m) => m.useridfrom !== userId)) onIncoming?.();
    } catch {
      /* Try again on the next poll. */
    }
  }

  /** Shows messages the viewer just sent. */
  function append(messages: ThreadMessage[]) {
    if (current) add(current.conversationId, { messages, members: [] });
  }

  return {
    messages: current?.messages ?? [],
    members: current?.members ?? {},
    hasOlder: current?.hasOlder ?? false,
    ready: !!current,
    loading: !!conversationId && !current && !failed,
    error: failed && error ? error.message : null,
    loadingOlder,
    loadOlder,
    poll,
    append,
    /** Fetches the first page again (after a load error). */
    reload: () => setAttempt((a) => a + 1),
  };
}
