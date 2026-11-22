"use client";
import { AlertCircle, RotateCw } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Button } from "./Button";
import { Skeleton } from "./Skeleton";

/** Renders loading / error / content based on a useMoodle() result. */
export function QueryState({
  loading,
  error,
  onRetry,
  children,
  skeleton,
}: {
  loading: boolean;
  error: string | null;
  /** Shows a retry button with the error. */
  onRetry?: () => void;
  children: React.ReactNode;
  /** Custom loading placeholder; defaults to a few skeleton rows. */
  skeleton?: React.ReactNode;
}) {
  const t = useT();
  if (loading) {
    return (
      <div role="status" aria-busy="true">
        <span className="sr-only">{t("common.loading")}</span>
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
      <div role="alert" className="flex items-start gap-3 rounded-card border border-error/30 bg-error-soft p-4 text-error-text">
        <AlertCircle size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t("common.errorTitle")}</p>
          <p className="mt-0.5 text-[13px] opacity-80">{error}</p>
        </div>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry} className="shrink-0">
            <RotateCw size={15} aria-hidden />
            {t("common.retry")}
          </Button>
        )}
      </div>
    );
  }
  return <>{children}</>;
}
