"use client";
import { AlertCircle } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Skeleton } from "./Skeleton";

/** Renders loading / error / content based on a useMoodle() result. */
export function QueryState({
  loading,
  error,
  children,
  skeleton,
}: {
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
  /** Custom loading placeholder; defaults to a few skeleton rows. */
  skeleton?: React.ReactNode;
}) {
  const t = useT();
  if (loading) {
    return (
      <div aria-busy="true" aria-label={t("common.loading")}>
        {skeleton ?? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-2/3" />
          </div>
        )}
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-error/30 bg-error-soft p-4 text-error">
        <AlertCircle size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">{t("common.errorTitle")}</p>
          <p className="mt-0.5 text-[13px] opacity-80">{error}</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
