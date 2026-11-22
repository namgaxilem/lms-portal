/** \core_message\api conversation types. */
export const CONVERSATION_TYPE = { individual: 1, group: 2, self: 3 } as const;

/** Conversation member (core_message external get_conversation_member_structure). */
export interface ConversationMember {
  id: number;
  fullname: string;
  profileimageurl: string;
  isonline?: boolean | null;
  showonlinestatus?: boolean;
  /** The viewer blocked this user. */
  isblocked?: boolean;
  isdeleted?: boolean;
  /** Only filled with privacy info (individual conversations, get_member_info). */
  canmessage?: boolean | null;
  requirescontact?: boolean | null;
}

export interface ThreadMessage {
  id: number;
  useridfrom: number;
  /** Formatted HTML (format_text output). */
  text: string;
  timecreated: number;
}

/** A conversation as returned by core_message_get_conversation(s) and friends. */
export interface MoodleConversation {
  id: number;
  name: string | null;
  /** Course name for course-group conversations. */
  subname?: string | null;
  /** Group picture for course-group conversations. */
  imageurl?: string | null;
  type: number;
  membercount?: number;
  unreadcount: number | null;
  /**
   * In lists: the other person (1:1), yourself (self) or only the last sender
   * (group). From get_conversation: every member except the viewer.
   */
  members: ConversationMember[];
  /** Newest first. */
  messages: ThreadMessage[];
}

export interface ConversationMessagesPage {
  id: number;
  /** Senders of the returned messages. */
  members: ConversationMember[];
  messages: ThreadMessage[];
}

/** One entry of core_message_send_instant_messages' result. */
export interface InstantMessageResult {
  /** Id of the created message, or -1 when it could not be sent. */
  msgid: number;
  errormessage?: string;
  conversationid?: number | null;
}

/** What a messages URL points at: a person (/messages/{userId}) or a conversation. */
export type MessageTarget =
  | { kind: "user"; userId: number }
  | { kind: "conversation"; conversationId: number };
