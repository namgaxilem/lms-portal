"use client";
import { use } from "react";
import { MessagesView } from "@/components/messages/MessagesView";

/** /messages/conversation/{conversationId}: a group (or other id-addressed) conversation. */
export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const conversationId = Number(id);
  return (
    <MessagesView
      target={
        Number.isInteger(conversationId) && conversationId > 0 ? { kind: "conversation", conversationId } : undefined
      }
    />
  );
}
