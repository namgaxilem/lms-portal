"use client";
import { PartyPopper } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Card, Progress, SectionTitle, Skeleton, cn } from "@/components/ui";
import { MilestoneMedal, milestoneAmount } from "@/components/MilestoneMedal";
import type { Milestone } from "@/lib/learning";

/**
 * Portal-defined milestones computed from real completion data (computeMilestones);
 * they are not Moodle badges.
 */
export function MilestonesCard({ milestones, loading }: { milestones: Milestone[]; loading: boolean }) {
  const t = useT();
  const next = milestones.find((m) => !m.done);

  return (
    <section aria-labelledby="dashboard-milestones">
      <Card className="p-5">
        <SectionTitle className="mb-1" title={<span id="dashboard-milestones">{t("milestones.title")}</span>} />
        <p className="mb-4 text-[13px] text-subtle">{t("milestones.hint")}</p>
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="mx-auto h-14 w-14 rounded-full" />
            ))}
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-3 gap-x-2 gap-y-4">
              {milestones.map((m) => (
                <li key={m.key} className="flex flex-col items-center gap-1.5 text-center" title={t(`milestones.rule.${m.key}`)}>
                  <MilestoneMedal milestone={m} />
                  <span className={cn("text-[11px] font-semibold leading-tight", m.done ? "text-fg" : "text-subtle")}>
                    {t(`milestones.name.${m.key}`)}
                  </span>
                  <span className="sr-only">
                    {m.done ? t("milestones.done") : t("milestones.locked")} · {t(`milestones.rule.${m.key}`)}
                  </span>
                </li>
              ))}
            </ul>
            {next ? (
              <div className="mt-4 rounded-2xl bg-success-soft p-3">
                <div className="flex justify-between gap-2 text-xs font-bold text-success-text">
                  <span className="truncate">{t(`milestones.rule.${next.key}`)}</span>
                  <span className="tabular-nums">{milestoneAmount(next)}</span>
                </div>
                <Progress
                  value={(next.value / next.target) * 100}
                  tone="success"
                  size="sm"
                  className="mt-2"
                  trackClassName="bg-white/70 dark:bg-white/10"
                  label={t(`milestones.name.${next.key}`)}
                />
              </div>
            ) : (
              <p className="mt-4 flex items-center gap-2 rounded-2xl bg-success-soft p-3 text-xs font-bold text-success-text">
                <PartyPopper size={16} aria-hidden />
                {t("milestones.allDone")}
              </p>
            )}
          </>
        )}
      </Card>
    </section>
  );
}
