"use client";
import type { LucideIcon } from "lucide-react";
import {
  AtSign,
  Building,
  Building2,
  CalendarDays,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
} from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useMoodle } from "@/lib/client-api";
import { useT } from "@/i18n/I18nProvider";
import { UserAvatar } from "@/components/UserAvatar";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  PageHeader,
  QueryState,
  type Tone,
} from "@/components/ui";
import { accountRole } from "@/lib/format";
import { MOODLE_BASE } from "@/lib/public-config";
import type { AccountRole, UserProfile } from "@/lib/moodle/types";

function fmtDate(ts?: number) {
  if (!ts) return null;
  return new Date(ts * 1000).toLocaleDateString();
}

const ROLE_TONE: Record<AccountRole, Tone> = {
  admin: "primary",
  teacher: "success",
  student: "neutral",
};

export default function ProfilePage() {
  const { user } = useSession();
  const t = useT();

  const { data, loading, error } = useMoodle<UserProfile[]>(
    "core_user_get_users_by_field",
    { field: "id", values: [user.id] }
  );

  const p = data?.[0];
  const role = accountRole(user);
  const location = [p?.city, p?.country].filter(Boolean).join(", ");

  const rows: { icon: LucideIcon; label: string; value?: string | null }[] = [
    { icon: AtSign, label: t("profile.username"), value: p?.username ?? user.username },
    { icon: Mail, label: t("profile.email"), value: p?.email },
    { icon: MapPin, label: t("profile.location"), value: location },
    { icon: Building, label: t("profile.department"), value: p?.department },
    { icon: Building2, label: t("profile.institution"), value: p?.institution },
    { icon: Clock, label: t("profile.lastAccess"), value: fmtDate(p?.lastaccess) },
    { icon: CalendarDays, label: t("profile.memberSince"), value: fmtDate(p?.firstaccess) },
  ];

  // Only the site admin is sent to the Moodle website.
  const moodleProfileUrl = MOODLE_BASE && user.isSiteAdmin
    ? `${MOODLE_BASE}/user/profile.php?id=${user.id}`
    : null;

  return (
    <div>
      <PageHeader title={t("profile.title")} />

      <QueryState loading={loading} error={error}>
        <div className="space-y-6">
          {/* Identity */}
          <Card className="animate-fade-in-up p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <UserAvatar
                name={p?.fullname ?? user.fullname}
                id={user.id}
                src={p?.profileimageurl || user.pictureurl || undefined}
                size={64}
              />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-semibold tracking-tight text-fg">
                  {p?.fullname ?? user.fullname}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
                  <span className="truncate">@{p?.username ?? user.username}</span>
                  <Badge tone={ROLE_TONE[role]}>{t(`role.${role}`)}</Badge>
                  {user.sitename && (
                    <span className="truncate text-[13px] text-subtle">
                      · {user.sitename}
                    </span>
                  )}
                </div>
              </div>
              {moodleProfileUrl && (
                <Button
                  variant="secondary"
                  href={moodleProfileUrl}
                  external
                  className="self-start sm:self-center"
                >
                  {t("profile.openInMoodle")}
                  <ExternalLink size={16} strokeWidth={1.75} />
                </Button>
              )}
            </div>
          </Card>

          {/* Account details */}
          <Card className="animate-fade-in-up">
            <CardHeader title={t("profile.account")} />
            <dl className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2">
              {rows.map(({ icon: Icon, label, value }) => (
                <div key={label} className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-xs text-subtle">
                    <Icon size={14} strokeWidth={1.75} />
                    {label}
                  </dt>
                  <dd className="mt-1 truncate text-sm text-fg">
                    {value || (
                      <span className="text-subtle">{t("profile.notProvided")}</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </QueryState>
    </div>
  );
}
