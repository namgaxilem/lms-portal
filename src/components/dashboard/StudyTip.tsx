"use client";
import { Lightbulb } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { useClientValue } from "./useClientValue";

/** Generic study advice (portal copy, not data); one per local calendar day. */
const TIPS = ["schedule", "deadlines", "notes", "breaks", "practice", "ask"] as const;

const localDayNumber = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60_000) / 86_400_000);

export function StudyTip() {
  const t = useT();
  const day = useClientValue(localDayNumber);
  if (day === null) return null;
  return (
    <section
      aria-labelledby="dashboard-tip"
      className="relative overflow-hidden rounded-card bg-linear-to-br from-amber-100 to-orange-100 p-5 dark:from-amber-500/15 dark:to-orange-500/10"
    >
      <span
        aria-hidden
        className="absolute -right-3 -top-3 grid h-20 w-20 place-items-center rounded-full bg-white/50 text-amber-500 dark:bg-white/5 dark:text-amber-300"
      >
        <Lightbulb size={30} />
      </span>
      <h2 id="dashboard-tip" className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
        {t("dashboard.tipTitle")}
      </h2>
      <p className="mt-2 pr-14 text-sm font-semibold leading-relaxed text-amber-950 dark:text-amber-50">
        {t(`dashboard.tips.${TIPS[day % TIPS.length]}`)}
      </p>
    </section>
  );
}
