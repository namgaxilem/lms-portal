"use client";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";

/** Icon link that opens a conversation with a course member. */
export function MessageLink({ userId, name }: { userId: number; name: string }) {
  const t = useT();
  const label = t("course.members.message", { name });
  return (
    <Link
      href={`/messages/${userId}`}
      aria-label={label}
      title={label}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-text transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <MessageCircle size={17} aria-hidden />
    </Link>
  );
}
