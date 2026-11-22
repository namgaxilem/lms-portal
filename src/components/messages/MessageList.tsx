"use client";
import { Fragment } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { UserAvatar } from "@/components/UserAvatar";
import { RichText, cn } from "@/components/ui";
import { dayKey, dayLabel, formatTime } from "@/lib/format";
import type { ConversationMember, ThreadMessage } from "./types";

/** Messages from one sender less than this apart form one visual run. */
const RUN_GAP_S = 5 * 60;

function sameRun(a: ThreadMessage | undefined, b: ThreadMessage | undefined) {
  return (
    !!a &&
    !!b &&
    a.useridfrom === b.useridfrom &&
    Math.abs(b.timecreated - a.timecreated) <= RUN_GAP_S &&
    dayKey(a.timecreated) === dayKey(b.timecreated)
  );
}

/**
 * Chat bubbles, oldest first, with a pill per day. Own messages are on the
 * right in the brand colour; consecutive messages from one sender are grouped
 * and show the time once. Group chats add the sender's name and picture.
 * Bodies are Moodle-formatted HTML, rendered sanitized (links stay clickable).
 */
export function MessageList({
  messages,
  members,
  isGroup,
}: {
  messages: ThreadMessage[];
  members: Record<number, ConversationMember>;
  isGroup: boolean;
}) {
  const { user } = useSession();
  const t = useT();
  const { locale } = useLocale();

  return (
    <>
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const mine = m.useridfrom === user.id;
        const newDay = !prev || dayKey(prev.timecreated) !== dayKey(m.timecreated);
        const startsRun = !sameRun(prev, m);
        const endsRun = !sameRun(m, next);
        const sender = members[m.useridfrom];
        const showSender = isGroup && !mine;

        return (
          <Fragment key={m.id}>
            {newDay && (
              <div className="my-4 flex justify-center first:mt-0">
                <span className="rounded-full bg-surface px-3 py-1 text-2xs font-semibold text-muted shadow-card ring-1 ring-line/60 dark:ring-line">
                  {dayLabel(m.timecreated, locale)}
                </span>
              </div>
            )}
            <div
              className={cn(
                "flex items-end gap-2",
                mine ? "justify-end" : "justify-start",
                startsRun && !newDay ? "mt-3" : "mt-0.5"
              )}
            >
              {showSender &&
                (endsRun ? (
                  <UserAvatar
                    id={m.useridfrom}
                    name={sender?.fullname ?? "?"}
                    src={sender?.profileimageurl}
                    size={28}
                  />
                ) : (
                  <span aria-hidden className="w-7 shrink-0" />
                ))}
              <div className={cn("flex min-w-0 max-w-[85%] flex-col sm:max-w-[70%]", mine ? "items-end" : "items-start")}>
                {showSender && startsRun && (
                  <span className="mb-1 px-1 text-xs font-semibold text-muted">
                    {sender?.fullname ?? t("messages.unknownSender")}
                  </span>
                )}
                <div
                  className={cn(
                    "max-w-full rounded-3xl px-4 py-2.5 shadow-sm",
                    mine
                      ? "bg-primary text-primary-fg [&_.rich-text]:text-current [&_a]:text-current"
                      : "bg-surface text-fg ring-1 ring-line/60 dark:ring-line",
                    mine && !startsRun && "rounded-tr-lg",
                    mine && !endsRun && "rounded-br-lg",
                    mine && endsRun && "rounded-br-md",
                    !mine && !startsRun && "rounded-tl-lg",
                    !mine && !endsRun && "rounded-bl-lg",
                    !mine && endsRun && "rounded-bl-md"
                  )}
                >
                  <span className="sr-only">
                    {mine ? t("messages.you") : (sender?.fullname ?? t("messages.unknownSender"))}:{" "}
                  </span>
                  <RichText html={m.text} />
                </div>
                {endsRun && (
                  <time
                    dateTime={new Date(m.timecreated * 1000).toISOString()}
                    className="mt-1 px-1.5 text-2xs tabular-nums text-subtle"
                  >
                    {formatTime(m.timecreated, locale)}
                  </time>
                )}
              </div>
            </div>
          </Fragment>
        );
      })}
    </>
  );
}
