"use client";
import { NotebookPen, Users } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { FallbackImg, IconTile, cn } from "@/components/ui";
import type { AvatarSource } from "./lib";

/**
 * Pixel size per variant, the IconTile size closest to it and the overrides
 * that make the tile exactly that size (so tiles line up with photos).
 */
const SIZES = {
  sm: { px: 40, tile: "sm", fit: "h-10! w-10!", radius: "rounded-xl" },
  md: { px: 44, tile: "md", fit: undefined, radius: "rounded-2xl" },
  lg: { px: 72, tile: "lg", fit: "h-18! w-18! rounded-3xl!", radius: "rounded-3xl" },
} as const;

/*
 * Moodle always fills a group conversation's imageurl: without a group picture
 * it is the theme's generic group icon (…/theme/image.php/…/g/g1, or
 * …image=g%2Fg1 without slash arguments). Show the coloured tile instead.
 */
const DEFAULT_GROUP_PIC = /\/theme\/image\.php(?:\/.*\/g\/g1\b|\?.*image=g(?:%2F|\/)g1\b)/i;

/**
 * Picture for a conversation: the person's photo (or initials), an amber
 * notebook tile for the personal notes space, or the group picture / a violet
 * group tile. `highlight` rings a person in the brand gradient (unread).
 */
export function ConversationAvatar({
  avatar,
  size = "md",
  highlight,
  showOnline,
}: {
  avatar: AvatarSource;
  /** sm 40px (thread header), md 44px (list rows), lg 72px (empty thread). */
  size?: keyof typeof SIZES;
  highlight?: boolean;
  /** Green dot when Moodle reports the person online (and they share it). */
  showOnline?: boolean;
}) {
  const s = SIZES[size];

  if (avatar.kind === "self") {
    return <IconTile icon={NotebookPen} tone="warning" solid size={s.tile} className={s.fit} />;
  }

  if (avatar.kind === "group") {
    const picture = avatar.imageurl && !DEFAULT_GROUP_PIC.test(avatar.imageurl) ? avatar.imageurl : null;
    return (
      <FallbackImg
        src={picture}
        fallback={<IconTile icon={Users} tone="violet" solid size={s.tile} className={s.fit} />}
        style={{ width: s.px, height: s.px }}
        className={cn("shrink-0 object-cover", s.radius)}
      />
    );
  }

  const { member } = avatar;
  const online = showOnline && member.showonlinestatus && member.isonline;
  return (
    <span className="relative shrink-0">
      <span className={cn("block rounded-full", highlight && "bg-brand-gradient p-0.5")}>
        <span className={cn("block rounded-full", highlight && "bg-surface p-0.5")}>
          <UserAvatar
            id={member.id}
            name={member.fullname}
            src={member.profileimageurl}
            size={highlight ? s.px - 8 : s.px}
          />
        </span>
      </span>
      {online && (
        <span
          aria-hidden
          className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-surface"
        />
      )}
    </span>
  );
}
