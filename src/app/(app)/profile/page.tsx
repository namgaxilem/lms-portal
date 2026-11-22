"use client";
import { useSession } from "@/components/providers/SessionProvider";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { PageHeader } from "@/components/ui";
import { AccountDetails } from "@/components/profile/AccountDetails";
import { LearningSummary } from "@/components/profile/LearningSummary";
import { PreferencesCard } from "@/components/profile/PreferencesCard";
import { ProfileHero } from "@/components/profile/ProfileHero";
import type { UserProfile } from "@/lib/moodle/types";

export default function ProfilePage() {
  const t = useT();
  const { user } = useSession();
  const { data, loading, error } = useMoodle<UserProfile[]>("core_user_get_users_by_field", {
    field: "id",
    values: [user.id],
  });
  const profile = data?.[0];

  return (
    <div>
      <PageHeader title={t("profile.title")} />
      <div className="space-y-6">
        {/* Rendered from the session, so a failed profile request only affects the details card. */}
        <ProfileHero profile={profile} />
        {/* Side by side from xl only: below that the main column is too narrow for the tiles and details. */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-6">
            <LearningSummary />
            <AccountDetails profile={profile} loading={loading} error={error} />
          </div>
          <aside className="min-w-0">
            <PreferencesCard />
          </aside>
        </div>
      </div>
    </div>
  );
}
