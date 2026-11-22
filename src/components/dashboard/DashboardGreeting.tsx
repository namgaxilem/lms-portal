"use client";
import type { ReactNode } from "react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { intlLocale } from "@/lib/format";
import { useClientValue } from "./useClientValue";

function greetingKey(hour: number) {
  if (hour < 12) return "dashboard.greetingMorning";
  if (hour < 18) return "dashboard.greetingAfternoon";
  return "dashboard.greetingEvening";
}

/**
 * Page heading: today's date, a time-of-day greeting and a one-line summary.
 * Date and greeting use the browser clock, so they render after hydration.
 */
export function DashboardGreeting({ name, summary }: { name: string; summary: ReactNode }) {
  const t = useT();
  const { locale } = useLocale();
  const key = useClientValue(() => greetingKey(new Date().getHours()));
  const today = useClientValue(() => {
    const s = new Date().toLocaleDateString(intlLocale(locale), { weekday: "long", day: "numeric", month: "long" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  });

  return (
    <header>
      <p className="min-h-5 text-sm font-semibold text-primary-text">{today}</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
        {t(key ?? "dashboard.greeting", { name })}
      </h1>
      <p className="mt-1 min-h-6 text-[15px] text-muted">{summary}</p>
    </header>
  );
}
