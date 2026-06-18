"use client";
import { Avatar } from "antd";
import { useSession } from "@/components/providers/SessionProvider";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { QueryState } from "@/components/ui/QueryState";
import { MaterialIcon } from "@/components/MaterialIcon";
import { MOODLE_BASE } from "@/lib/public-config";
import type { UserProfile } from "@/lib/moodle/types";

function fmtDate(ts?: number) {
  if (!ts) return null;
  return new Date(ts * 1000).toLocaleDateString();
}

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-primary text-on-primary",
  teacher: "bg-secondary text-on-secondary",
  student: "bg-surface-container-high text-on-surface-variant",
};

export default function ProfilePage() {
  const { user } = useSession();
  const t = useT();

  const { data, loading, error } = useMoodle<UserProfile[]>(
    "core_user_get_users_by_field",
    { field: "id", values: [user.id] }
  );

  const p = data?.[0];
  const accountRole =
    user.highestRole ?? (user.isSiteAdmin ? "admin" : "student");

  const initials = user.fullname
    .split(" ")
    .map((s) => s[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  const location = [p?.city, p?.country].filter(Boolean).join(", ");

  const rows = [
    { icon: "badge", label: t("profile.username"), value: p?.username ?? user.username },
    { icon: "mail", label: t("profile.email"), value: p?.email },
    { icon: "place", label: t("profile.location"), value: location },
    { icon: "business", label: t("profile.department"), value: p?.department },
    { icon: "apartment", label: t("profile.institution"), value: p?.institution },
    { icon: "schedule", label: t("profile.lastAccess"), value: fmtDate(p?.lastaccess) },
    { icon: "event", label: t("profile.memberSince"), value: fmtDate(p?.firstaccess) },
  ];

  return (
    <div className="space-y-gutter">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container/10 text-primary">
          <MaterialIcon name="account_circle" fill />
        </div>
        <h2 className="font-headline-md text-headline-md text-on-surface">
          {t("profile.title")}
        </h2>
      </div>

      <QueryState loading={loading} error={error}>
        <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
          {/* Identity card */}
          <div className="overflow-hidden rounded-xl bg-surface-container-lowest card-elevation animate-fade-in-up lg:col-span-4">
            <div className="h-24 bg-gradient-to-br from-primary to-secondary" />
            <div className="-mt-12 flex flex-col items-center px-6 pb-6 text-center">
              <Avatar
                size={96}
                src={(p?.profileimageurl || user.pictureurl) || undefined}
                className="border-4 border-surface-container-lowest bg-primary-container text-2xl text-on-primary"
              >
                {initials}
              </Avatar>
              <h3 className="mt-3 font-headline-sm text-headline-sm text-on-surface">
                {p?.fullname ?? user.fullname}
              </h3>
              <span
                className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold capitalize ${ROLE_BADGE[accountRole]}`}
              >
                <MaterialIcon
                  name={
                    accountRole === "admin"
                      ? "shield_person"
                      : accountRole === "teacher"
                        ? "co_present"
                        : "school"
                  }
                  className="!text-sm"
                />
                {t(`role.${accountRole}`)}
              </span>
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                {user.sitename}
              </p>

              {MOODLE_BASE && (
                <a
                  href={`${MOODLE_BASE}/user/profile.php?id=${user.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface transition-colors hover:border-primary hover:text-primary"
                >
                  <MaterialIcon name="open_in_new" className="!text-base" />
                  {t("profile.openInMoodle")}
                </a>
              )}
            </div>
          </div>

          {/* Account details */}
          <div className="rounded-xl bg-surface-container-lowest p-gutter card-elevation animate-fade-in-up lg:col-span-8">
            <h3 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
              {t("profile.account")}
            </h3>
            <dl className="divide-y divide-outline-variant/20">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center gap-4 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary">
                    <MaterialIcon name={r.icon} className="!text-lg" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <dt className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                      {r.label}
                    </dt>
                    <dd className="truncate font-body-md text-body-md text-on-surface">
                      {r.value || (
                        <span className="text-on-surface-variant/60">
                          {t("profile.notProvided")}
                        </span>
                      )}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </QueryState>
    </div>
  );
}
