"use client";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AtSign,
  Building,
  Building2,
  CalendarDays,
  Clock,
  IdCard,
  Info,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Card, CardHeader, QueryState, RichText, Skeleton, cn } from "@/components/ui";
import { formatDate, formatDateTime, intlLocale, pickLanguage, plainText } from "@/lib/format";
import type { ProfileCustomField, UserProfile } from "@/lib/moodle/types";

interface DetailRow {
  key: string;
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  /** Single-line values are truncated (with the full text in a tooltip). */
  text?: string;
}

/** Country name in the UI language ("VN" → "Việt Nam" / "Vietnam"). */
function countryName(code: string | undefined, locale: string): string {
  if (!code) return "";
  try {
    return new Intl.DisplayNames([intlLocale(locale)], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Field names and menu values arrive unformatted: keep the UI language, as plain text. */
/** Unfiltered multi-language text (field names, menu values) as plain text in the UI language. */
const fieldText = (text: string, locale: string) => plainText(pickLanguage(text, locale));

function CustomFieldValue({ field }: { field: ProfileCustomField }) {
  const t = useT();
  const { locale } = useLocale();
  if (field.type === "datetime") return <>{formatDate(Number(field.value), locale)}</>;
  if (field.type === "checkbox") return <>{field.value === "1" ? t("profile.yes") : t("profile.no")}</>;
  if (field.type === "menu") return <>{fieldText(field.value, locale)}</>;
  // text / textarea come back formatted (HTML); plugin types are rendered safely the same way.
  return <RichText html={pickLanguage(field.value, locale)} className="text-sm" />;
}

function DetailsSkeleton() {
  return (
    <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
      ))}
    </div>
  );
}

/**
 * The account record from core_user_get_users_by_field: core fields (with a
 * "not provided" placeholder), optional ones only when Moodle sends them,
 * visible custom profile fields and the profile description.
 */
export function AccountDetails({
  profile,
  loading,
  error,
}: {
  profile: UserProfile | undefined;
  loading: boolean;
  error: string | null;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { user } = useSession();
  const p = profile;
  const location = [p?.city, countryName(p?.country, locale)].filter(Boolean).join(", ");
  const phone = [p?.phone1, p?.phone2].filter(Boolean).join(" · ");
  const username = p?.username ?? user.username;

  const rows: DetailRow[] = [
    { key: "username", icon: AtSign, label: t("profile.username"), value: username, text: username },
    { key: "email", icon: Mail, label: t("profile.email"), value: p?.email, text: p?.email },
    ...(p?.idnumber ? [{ key: "idnumber", icon: IdCard, label: t("profile.idnumber"), value: p.idnumber, text: p.idnumber }] : []),
    ...(phone ? [{ key: "phone", icon: Phone, label: t("profile.phone"), value: phone, text: phone }] : []),
    { key: "location", icon: MapPin, label: t("profile.location"), value: location, text: location },
    { key: "department", icon: Building, label: t("profile.department"), value: p?.department, text: p?.department },
    { key: "institution", icon: Building2, label: t("profile.institution"), value: p?.institution, text: p?.institution },
    { key: "lastaccess", icon: Clock, label: t("profile.lastAccess"), value: formatDateTime(p?.lastaccess, locale) },
    { key: "firstaccess", icon: CalendarDays, label: t("profile.memberSince"), value: formatDate(p?.firstaccess, locale) },
    ...(p?.customfields ?? []).map((f) => ({
      key: `cf-${f.shortname}`,
      icon: Info,
      label: fieldText(f.name, locale),
      value: <CustomFieldValue field={f} />,
    })),
  ];

  return (
    <Card className="animate-fade-in-up">
      <CardHeader title={t("profile.account")} description={t("profile.managedInMoodle")} />
      <div className="p-5 pt-4">
        <QueryState loading={loading} error={error} skeleton={<DetailsSkeleton />}>
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {rows.map(({ key, icon: Icon, label, value, text }) => (
              <div key={key} className="min-w-0">
                <dt className="flex items-center gap-1.5 text-xs font-medium text-subtle">
                  <Icon size={14} aria-hidden className="shrink-0" />
                  <span className="truncate">{label}</span>
                </dt>
                <dd className={cn("mt-1 text-sm font-semibold text-fg", text !== undefined && "truncate")} title={text || undefined}>
                  {value || <span className="font-normal text-subtle">{t("profile.notProvided")}</span>}
                </dd>
              </div>
            ))}
          </dl>
          {p?.description && (
            <section className="mt-6 border-t border-line pt-5">
              <h3 className="text-sm font-bold text-fg">{t("profile.about")}</h3>
              <RichText html={p.description} className="mt-2" />
            </section>
          )}
        </QueryState>
      </div>
    </Card>
  );
}
