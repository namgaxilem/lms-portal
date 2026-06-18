"use client";
import { useT } from "@/i18n/I18nProvider";
import { MaterialIcon } from "@/components/MaterialIcon";

/** Renders loading / error / content based on a useMoodle() result. */
export function QueryState({
  loading,
  error,
  children,
}: {
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  const t = useT();
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-on-surface-variant">
        <MaterialIcon
          name="progress_activity"
          className="!text-4xl text-primary animate-spin"
        />
        <span className="font-body-sm text-body-sm">{t("common.loading")}</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border-l-4 border-error bg-error-container/40 p-4 text-on-error-container">
        <MaterialIcon name="error" fill className="!text-xl" />
        <div>
          <p className="font-body-md font-bold">{t("common.errorTitle")}</p>
          <p className="font-body-sm text-body-sm opacity-80">{error}</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
