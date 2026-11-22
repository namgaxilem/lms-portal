"use client";
import { use, useState, useSyncExternalStore } from "react";
import { useT } from "@/i18n/I18nProvider";
import { PageHeader, Skeleton } from "@/components/ui";
import { CalendarView } from "@/components/calendar/CalendarView";
import { currentMonth, parseMonth } from "@/components/calendar/lib";

const noopSubscribe = () => () => {};

export default function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string | string[] }> }) {
  const t = useT();
  const requested = parseMonth(use(searchParams).month);
  // "This month" depends on the viewer's clock and timezone, so it is only
  // resolved in the browser (the server may be in another timezone).
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [today] = useState(currentMonth);

  if (!isClient) {
    return (
      <div role="status" aria-busy="true">
        <PageHeader title={t("nav.calendar")} description={t("calendar.subtitle")} />
        <span className="sr-only">{t("common.loading")}</span>
        <Skeleton className="h-[36rem] rounded-card" />
      </div>
    );
  }

  const month = requested ?? today;
  const isCurrent = month.year === today.year && month.month === today.month;
  return <CalendarView month={month} isCurrent={isCurrent} />;
}
