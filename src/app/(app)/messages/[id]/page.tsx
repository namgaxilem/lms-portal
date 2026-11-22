"use client";
import { use } from "react";
import { MessagesView } from "@/components/messages/MessagesView";

/** /messages/{userId}: the 1:1 chat with that person (your own id: personal notes). */
export default function MessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const userId = Number(id);
  return (
    <MessagesView target={Number.isInteger(userId) && userId > 0 ? { kind: "user", userId } : undefined} />
  );
}
