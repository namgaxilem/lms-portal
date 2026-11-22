"use client";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AtSign, Building2, ExternalLink, Mail, ShieldCheck } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useT } from "@/i18n/I18nProvider";
import { UserAvatar } from "@/components/UserAvatar";
import { Button, HeroCard } from "@/components/ui";
import { accountRole } from "@/lib/format";
import { moodleBase } from "@/lib/public-config";
import type { UserProfile } from "@/lib/moodle/types";

function HeroChip({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[13px] font-semibold backdrop-blur-sm">
      <Icon size={14} aria-hidden className="shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  );
}

/**
 * Identity banner in the school's brand gradient. Name, avatar, role and site
 * come from the session so it renders even if the profile request fails;
 * username and email are shown as Moodle returns them once loaded.
 */
export function ProfileHero({ profile }: { profile: UserProfile | undefined }) {
  const t = useT();
  const { user } = useSession();
  const role = accountRole(user);
  // Only site admins are sent to the Moodle website, and only when its URL is configured.
  const moodleProfileUrl = user.isSiteAdmin && moodleBase() ? `${moodleBase()}/user/profile.php?id=${user.id}` : null;

  return (
    <HeroCard className="animate-fade-in-up">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
        <UserAvatar
          name={user.fullname}
          id={user.id}
          src={profile?.profileimageurl || user.pictureurl}
          size={96}
          className="shadow-lg ring-4 ring-white/30"
        />
        <div className="min-w-0 flex-1">
          {/*
            Always the session name (site_info). core_user_get_users_by_field
            returns the "alternative full name format" to viewers who can see
            full names (admins, teachers), which can differ from the shell.
          */}
          <h2 className="break-words text-2xl font-extrabold tracking-tight sm:text-3xl">{user.fullname}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <HeroChip icon={ShieldCheck}>{t(`role.${role}`)}</HeroChip>
            <HeroChip icon={AtSign}>{profile?.username ?? user.username}</HeroChip>
            {profile?.email && <HeroChip icon={Mail}>{profile.email}</HeroChip>}
            {user.sitename && <HeroChip icon={Building2}>{user.sitename}</HeroChip>}
          </div>
        </div>
        {moodleProfileUrl && (
          <Button href={moodleProfileUrl} external variant="light" className="self-start sm:self-center">
            {t("profile.openInMoodle")}
            <ExternalLink size={16} aria-hidden />
          </Button>
        )}
      </div>
    </HeroCard>
  );
}
