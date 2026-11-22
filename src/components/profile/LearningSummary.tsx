"use client";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CalendarCheck, CircleCheck, Flame, Sparkles, Trophy } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useT } from "@/i18n/I18nProvider";
import { Card, CardHeader, EmptyState, IconTile, QueryState, Skeleton, type Tone } from "@/components/ui";
import { accountRole, isStaffRole } from "@/lib/format";
import { useMyLearningActivity } from "@/lib/moodle/hooks";
import { ActivityHeatmap } from "./ActivityHeatmap";

/** Four columns only when each tile has room for its label (container width, not viewport). */
const TILE_GRID = "grid grid-cols-2 gap-3 @2xl:grid-cols-4";

/** Icon above the number, so the label keeps the tile's full width and wraps instead of being cut. */
function Tile({ icon, tone, value, label }: { icon: LucideIcon; tone: Tone; value: ReactNode; label: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-surface-2/70 p-3">
      <IconTile icon={icon} tone={tone} solid size="sm" />
      <p className="mt-2 text-lg font-extrabold leading-tight tabular-nums text-fg">{value}</p>
      <p className="mt-0.5 text-xs font-medium leading-snug text-subtle">{label}</p>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="space-y-4">
      <div className={TILE_GRID}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-36 w-full max-w-2xl" />
    </div>
  );
}

/**
 * Streak, completions and a 16-week heatmap, all derived from the completion
 * times of activities in every tracked enrolment (useMyLearningActivity, the
 * same data as the shell streak and the dashboard). Hidden for staff with nothing to show.
 */
export function LearningSummary() {
  const t = useT();
  const { user } = useSession();
  const { stats, loading, error, reload } = useMyLearningActivity();
  const staff = isStaffRole(accountRole(user));

  if (staff && !error && !loading && !stats?.total) return null;

  return (
    <Card className="animate-fade-in-up">
      <CardHeader title={t("profile.learning")} description={t("profile.learningHint")} />
      <div className="@container p-5 pt-4">
        <QueryState loading={loading} error={error} onRetry={reload} skeleton={<SummarySkeleton />}>
          {!stats ? (
            <EmptyState icon={Sparkles} compact title={t("profile.noActivity")} hint={t("shell.streakStart")} />
          ) : (
            <div className="space-y-5">
              <div className={TILE_GRID}>
                <Tile icon={Flame} tone="warning" value={stats.streak} label={t("profile.streak")} />
                <Tile icon={Trophy} tone="violet" value={stats.best} label={t("profile.bestStreak")} />
                <Tile icon={CircleCheck} tone="success" value={stats.total} label={t("profile.completed")} />
                <Tile icon={CalendarCheck} tone="accent" value={stats.activeDays} label={t("profile.activeDays")} />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-bold text-fg">{t("profile.heatmapTitle")}</h3>
                <ActivityHeatmap days={stats.heat} />
              </div>
              {stats.total === 0 && <p className="text-[13px] text-subtle">{t("shell.streakStart")}</p>}
            </div>
          )}
        </QueryState>
      </div>
    </Card>
  );
}
