"use client";
import { use } from "react";
import { MessagesView } from "@/components/MessagesView";

export default function MessageThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <MessagesView targetUserId={Number(id)} />;
}
