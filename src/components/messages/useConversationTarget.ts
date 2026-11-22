"use client";
import { useEffect, useEffectEvent, useState } from "react";
import { moodleClient } from "@/lib/client-api";
import { useSiteFunctions } from "@/lib/moodle/hooks";
import type { UserProfile } from "@/lib/moodle/types";
import { targetKey } from "./lib";
import { CONVERSATION_TYPE, type ConversationMember, type MessageTarget, type MoodleConversation } from "./types";

/** Optional direct lookups (Moodle 3.6+ mobile service); without them the list is scanned. */
const LOOKUPS = [
  "core_message_get_self_conversation",
  "core_message_get_conversation_between_users",
  "core_message_get_conversation",
  "core_message_get_member_info",
] as const;
type Lookup = (typeof LOOKUPS)[number];

interface ResolvedTarget {
  /** Null when the person has no conversation with the viewer yet (a new chat). */
  conversation: MoodleConversation | null;
  /** The other person of a 1:1 or new chat; null for self and group chats, or when not found. */
  recipient: ConversationMember | null;
}

/** All conversations of one type (0 = no limit), for when the direct lookups are unavailable. */
async function listByType(userId: number, type: number) {
  const r = await moodleClient<{ conversations: MoodleConversation[] }>("core_message_get_conversations", {
    userid: userId,
    limitfrom: 0,
    limitnum: 0,
    type,
  });
  return r?.conversations ?? [];
}

/** Name, picture and messaging permission of someone the viewer has never messaged. */
async function memberInfo(userId: number, otherId: number, can: (fn: Lookup) => boolean) {
  if (can("core_message_get_member_info")) {
    try {
      const [member] = await moodleClient<ConversationMember[]>("core_message_get_member_info", {
        referenceuserid: userId,
        userids: [otherId],
        includecontactrequests: false,
        includeprivacyinfo: true,
      });
      if (member) return member;
    } catch {
      /* Fall back to the public profile. */
    }
  }
  const [profile] = await moodleClient<UserProfile[]>("core_user_get_users_by_field", {
    field: "id",
    values: [otherId],
  });
  return profile
    ? { id: profile.id, fullname: profile.fullname, profileimageurl: profile.profileimageurl ?? "" }
    : null;
}

async function resolveTarget(
  userId: number,
  target: MessageTarget,
  can: (fn: Lookup) => boolean
): Promise<ResolvedTarget> {
  // Only one message is requested: the thread pages messages itself.
  const one = { messagelimit: 1, messageoffset: 0, newestmessagesfirst: true };

  if (target.kind === "conversation") {
    let conversation: MoodleConversation | null = null;
    if (can("core_message_get_conversation")) {
      conversation = await moodleClient<MoodleConversation>("core_message_get_conversation", {
        userid: userId,
        conversationid: target.conversationId,
        includecontactrequests: false,
        includeprivacyinfo: true,
        // Enough for the other person of a 1:1; group senders come with their messages.
        memberlimit: 2,
        memberoffset: 0,
        ...one,
      }).catch(() => null);
    }
    if (!conversation) {
      const all = await moodleClient<{ conversations: MoodleConversation[] }>("core_message_get_conversations", {
        userid: userId,
        limitfrom: 0,
        limitnum: 0,
      });
      conversation = all?.conversations.find((c) => c.id === target.conversationId) ?? null;
    }
    const recipient =
      conversation?.type === CONVERSATION_TYPE.individual
        ? (conversation.members.find((m) => m.id !== userId) ?? null)
        : null;
    return { conversation, recipient };
  }

  // The personal notes space. Moodle creates it lazily on either call.
  if (target.userId === userId) {
    if (can("core_message_get_self_conversation")) {
      const self = await moodleClient<MoodleConversation>("core_message_get_self_conversation", {
        userid: userId,
        ...one,
      }).catch(() => null);
      if (self) return { conversation: self, recipient: null };
    }
    const [self] = await listByType(userId, CONVERSATION_TYPE.self);
    return { conversation: self ?? null, recipient: null };
  }

  // 1:1 chat. Moodle throws when the two have no conversation yet.
  if (can("core_message_get_conversation_between_users")) {
    const conversation = await moodleClient<MoodleConversation>("core_message_get_conversation_between_users", {
      userid: userId,
      otheruserid: target.userId,
      includecontactrequests: false,
      includeprivacyinfo: true,
      ...one,
    }).catch(() => null);
    const recipient = conversation?.members.find((m) => m.id === target.userId);
    if (conversation && recipient) return { conversation, recipient };
  }
  const existing = (await listByType(userId, CONVERSATION_TYPE.individual)).find((c) =>
    c.members.some((m) => m.id === target.userId)
  );
  if (existing) {
    return { conversation: existing, recipient: existing.members.find((m) => m.id === target.userId) ?? null };
  }
  return { conversation: null, recipient: await memberInfo(userId, target.userId, can) };
}

/**
 * Finds the conversation a messages URL points at, plus who the viewer is
 * talking to. Uses Moodle's direct lookups when the site offers them, so
 * history is found however far down the conversation list it is.
 */
export function useConversationTarget(userId: number, target: MessageTarget | undefined) {
  const site = useSiteFunctions();
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ key: string; data: ResolvedTarget | null; error: string | null } | null>(
    null
  );

  // Site info failing should not block messaging: fall back to scanning lists.
  const ready = !!site.data || !!site.error;
  const caps = LOOKUPS.map((fn) => (site.has(fn) ? 1 : 0)).join("");
  const tkey = targetKey(target);
  const key = tkey && ready ? `${userId}:${tkey}:${caps}:${version}` : null;

  const resolve = useEffectEvent(() => resolveTarget(userId, target!, (fn) => site.has(fn) === true));

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    resolve().then(
      (data) => !cancelled && setState({ key, data, error: null }),
      (e: Error) => !cancelled && setState({ key, data: null, error: e.message })
    );
    return () => {
      cancelled = true;
    };
  }, [key]);

  const current = key !== null && state?.key === key ? state : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: !!tkey && !current,
    /** Resolve again (after an error, or once a new chat got its conversation). */
    retry: () => setVersion((v) => v + 1),
  };
}
