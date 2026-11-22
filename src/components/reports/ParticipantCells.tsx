"use client";
import { Clock } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge, Progress, Skeleton } from "@/components/ui";
import { formatDate, formatDateTime, formatNumber, formatTime, timeAgo } from "@/lib/format";
import { type GradeRow } from "@/components/grades/lib";
import type { EnrolledUser } from "@/lib/moodle/types";
import { roleLabel, roleTone } from "./roles";
import type { LearnerCompletion } from "./types";

/** Avatar, name (the session name for the signed-in user) and email. */
export function PersonCell({ user, name, self }: { user: EnrolledUser; name: string; self: boolean }) {
  const t = useT();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar name={name} id={user.id} src={user.profileimageurlsmall} size={40} />
      <div className="min-w-0">
        <p className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold text-fg">{name}</span>
          {self && <Badge tone="primary">{t("reports.you")}</Badge>}
        </p>
        {user.email && <p className="truncate text-xs text-subtle">{user.email}</p>}
      </div>
    </div>
  );
}

export function RoleBadges({ user }: { user: EnrolledUser }) {
  const t = useT();
  if (!user.roles?.length) return <span className="text-subtle">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {user.roles.map((r) => (
        <Badge key={r.roleid ?? r.shortname} tone={roleTone(r)}>
          {roleLabel(r, t)}
        </Badge>
      ))}
    </div>
  );
}

/** A dash on screen, the reason for screen readers and in a tooltip. */
function Dash({ reason }: { reason: string }) {
  return (
    <span className="text-[13px] text-subtle" title={reason}>
      <span aria-hidden>—</span>
      <span className="sr-only">{reason}</span>
    </span>
  );
}

/** `completion` undefined = still loading. */
export function ProgressCell({ completion }: { completion: LearnerCompletion | undefined }) {
  const t = useT();
  const { locale } = useLocale();
  if (completion === undefined) {
    return (
      <div className="space-y-1.5" aria-hidden>
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    );
  }
  if (completion.status === "error") return <Dash reason={t("reports.progressUnavailable")} />;
  if (completion.status !== "tracked") return <Dash reason={t("reports.notTracked")} />;
  const { progress } = completion;
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <Progress
          value={progress.percent}
          tone={progress.percent >= 100 ? "success" : "gradient"}
          size="sm"
          label={t("reports.progress")}
        />
        <span className="w-10 shrink-0 text-right text-xs font-bold tabular-nums text-fg">
          {formatNumber(progress.percent, locale, 0)}%
        </span>
      </div>
      <p className="mt-1 text-xs tabular-nums text-subtle">
        {t("reports.activitiesDone", { done: progress.done, total: progress.total })}
      </p>
    </div>
  );
}

/** Relative time with the exact date underneath (visible, not hover-only). */
export function LastAccessCell({ value }: { value: number | undefined }) {
  const t = useT();
  const { locale } = useLocale();
  if (value === undefined) return <Dash reason={t("reports.lastAccessHidden")} />;
  if (value === 0) return <Badge tone="warning">{t("reports.never")}</Badge>;
  const relative = timeAgo(value, locale);
  // From 30 days on, timeAgo already prints the date: the second line then only adds the time.
  const exact = relative === formatDate(value, locale) ? formatTime(value, locale) : formatDateTime(value, locale);
  return (
    <div className="min-w-0 leading-tight">
      <p className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold text-fg">
        <Clock size={13} aria-hidden className="text-subtle" />
        {relative}
      </p>
      <time dateTime={new Date(value * 1000).toISOString()} className="mt-0.5 block whitespace-nowrap text-xs tabular-nums text-subtle">
        {exact}
      </time>
    </div>
  );
}

/** A learner's course total as the Moodle gradebook formats it. */
export function TotalCell({ total }: { total: GradeRow | null | undefined }) {
  const t = useT();
  if (!total || total.display === null) return <Dash reason={t("grades.noGradeYet")} />;
  const tone = total.passed === true ? "success" : total.passed === false ? "danger" : "neutral";
  return (
    <Badge tone={tone} className="tabular-nums">
      {total.display}
      {total.passed !== null && (
        <span className="sr-only">{total.passed ? t("grades.passed") : t("grades.failed")}</span>
      )}
    </Badge>
  );
}
