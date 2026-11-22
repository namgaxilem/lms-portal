import { decodeEntities } from "@/lib/format";
import type { SessionUser } from "@/lib/moodle/types";
import type { TFn } from "@/i18n/translate";
import {
  CONVERSATION_TYPE,
  type ConversationMember,
  type MessageTarget,
  type MoodleConversation,
  type ThreadMessage,
} from "./types";

/** Moodle's limit on a message's length, in bytes (core_message\api::MESSAGE_MAX_LENGTH). */
export const MESSAGE_MAX_BYTES = 4096;

export function byteLength(text: string) {
  return new TextEncoder().encode(text).length;
}

/** Union of two message lists by id, oldest first. */
export function mergeMessages(a: ThreadMessage[], b: ThreadMessage[]) {
  const byId = new Map<number, ThreadMessage>();
  for (const m of a) byId.set(m.id, m);
  for (const m of b) byId.set(m.id, m);
  return [...byId.values()].sort((x, y) => x.timecreated - y.timecreated || x.id - y.id);
}

export function sameTarget(a: MessageTarget | undefined, b: MessageTarget | undefined) {
  if (a?.kind === "user" && b?.kind === "user") return a.userId === b.userId;
  if (a?.kind === "conversation" && b?.kind === "conversation") return a.conversationId === b.conversationId;
  return false;
}

/** Stable string for a target (hook and React keys). */
export function targetKey(target: MessageTarget | undefined) {
  if (!target) return null;
  return target.kind === "user" ? `u${target.userId}` : `c${target.conversationId}`;
}

/** Avatar to draw for a conversation or thread. */
export type AvatarSource =
  | { kind: "self" }
  | { kind: "group"; imageurl?: string | null }
  | { kind: "person"; member: Pick<ConversationMember, "id" | "fullname" | "profileimageurl" | "isonline" | "showonlinestatus"> };

export interface ConversationView {
  id: number;
  href: string;
  /** Route target, to tell whether the row is the open conversation. */
  target: MessageTarget;
  /** Null when Moodle has no name (always for the self conversation): see `conversationTitle`. */
  title: string | null;
  subtitle: string | null;
  avatar: AvatarSource;
  last: ThreadMessage | null;
  unread: number;
}

/** Display title: "My notes" for the self conversation, else the name or a generic label. */
export function conversationTitle(view: Pick<ConversationView, "avatar" | "title">, t: TFn) {
  if (view.avatar.kind === "self") return t("messages.self");
  return view.title || t("messages.conversation");
}

/**
 * Avatar, title and subtitle of the open thread: the personal notes space, a
 * group (course name, else member count) or a person (online status). The
 * avatar is null while the person is unknown.
 */
export function describeThread(
  {
    isSelf,
    conversation,
    recipient,
  }: { isSelf: boolean; conversation: MoodleConversation | null; recipient: ConversationMember | null },
  t: TFn
): { avatar: AvatarSource | null; title: string; subtitle: string | null } {
  if (isSelf) return { avatar: { kind: "self" }, title: t("messages.self"), subtitle: t("messages.selfHint") };
  if (conversation?.type === CONVERSATION_TYPE.group) {
    const members = conversation.membercount ? t("messages.memberCount", { count: conversation.membercount }) : null;
    return {
      avatar: { kind: "group", imageurl: conversation.imageurl },
      title: conversation.name || t("messages.conversation"),
      subtitle: (conversation.subname && decodeEntities(conversation.subname)) || members,
    };
  }
  return {
    avatar: recipient ? { kind: "person", member: recipient } : null,
    title: recipient?.fullname ?? t("messages.conversation"),
    subtitle: recipient?.showonlinestatus && recipient.isonline ? t("messages.online") : null,
  };
}

/**
 * How a conversation row looks and where it links. Individual and self chats
 * keep the user-id routes (/messages/{userId}); group chats, whose list entry
 * only carries the last sender, link by conversation id.
 */
export function describeConversation(c: MoodleConversation, me: Pick<SessionUser, "id">): ConversationView {
  const last = c.messages[0] ?? null;
  const unread = c.unreadcount ?? 0;

  if (c.type === CONVERSATION_TYPE.self) {
    return {
      id: c.id,
      href: `/messages/${me.id}`,
      target: { kind: "user", userId: me.id },
      title: null,
      subtitle: null,
      avatar: { kind: "self" },
      last,
      unread: 0,
    };
  }

  const other = c.type === CONVERSATION_TYPE.individual ? c.members.find((m) => m.id !== me.id) : undefined;
  if (other) {
    return {
      id: c.id,
      href: `/messages/${other.id}`,
      target: { kind: "user", userId: other.id },
      title: other.fullname,
      subtitle: null,
      avatar: { kind: "person", member: other },
      last,
      unread,
    };
  }

  return {
    id: c.id,
    href: `/messages/conversation/${c.id}`,
    target: { kind: "conversation", conversationId: c.id },
    title: c.name || null,
    subtitle: c.subname ? decodeEntities(c.subname) : null,
    avatar: { kind: "group", imageurl: c.imageurl },
    last,
    unread,
  };
}
