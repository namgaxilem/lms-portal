"use client";
import { useSession } from "@/components/providers/SessionProvider";
import { useT } from "@/i18n/I18nProvider";
import { Badge, Card, CardHeader, Progress, Skeleton, cn } from "@/components/ui";
import { MilestoneMedal, milestoneAmount } from "@/components/MilestoneMedal";
import { accountRole, isStaffRole } from "@/lib/format";
import { useMyLearningActivity } from "@/lib/moodle/hooks";
import { computeMilestones, type Milestone } from "@/lib/learning";

function MilestoneTile({ m }: { m: Milestone }) {
  const t = useT();
  const name = t(`milestones.name.${m.key}`);
  return (
    <li className="flex flex-col items-center gap-2 rounded-2xl bg-surface-2/60 p-4 text-center">
      <MilestoneMedal milestone={m} size="lg" onTint />
      <p className="text-[13px] font-bold leading-snug text-fg">{name}</p>
      <p className="text-xs leading-snug text-muted">{t(`milestones.rule.${m.key}`)}</p>
      {m.done ? (
        <Badge tone="success" dot className="mt-auto">
          {t("milestones.done")}
        </Badge>
      ) : (
        <div className="mt-auto w-full">
          <Progress value={(m.value / m.target) * 100} tone="success" size="sm" label={name} />
          <p className="mt-1 text-2xs font-semibold tabular-nums text-subtle">{milestoneAmount(m)}</p>
        </div>
      )}
    </li>
  );
}

/**
 * Portal-computed learning milestones (not Moodle badges), computed exactly
 * like the dashboard's (useMyLearningActivity): completion timestamps of every
 * tracked enrolment and the best progress among them.
 * Hidden for staff whom no course tracks, as on the dashboard.
 */
export function MilestonesCard({ className }: { className?: string }) {
  const t = useT();
  const { user } = useSession();
  const staff = isStaffRole(accountRole(user));
  const activity = useMyLearningActivity();
  const { tracked, loading } = activity;

  if ((staff && tracked.length === 0) || (!loading && !activity.stats)) return null;

  const milestones = activity.stats ? computeMilestones(activity.stats, tracked.map((c) => c.progress ?? 0)) : [];
  const done = milestones.filter((m) => m.done).length;

  return (
    <Card className={cn("animate-fade-in-up", className)}>
      <CardHeader
        title={t("milestones.title")}
        description={t("milestones.hint")}
        action={
          activity.stats ? (
            <Badge tone="success">{t("milestones.count", { n: done, total: milestones.length })}</Badge>
          ) : undefined
        }
      />
      {activity.stats ? (
        <ul className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 xl:grid-cols-6">
          {milestones.map((m) => (
            <MilestoneTile key={m.key} m={m} />
          ))}
        </ul>
      ) : (
        <div role="status" aria-busy="true" className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 xl:grid-cols-6">
          <span className="sr-only">{t("common.loading")}</span>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      )}
    </Card>
  );
}
