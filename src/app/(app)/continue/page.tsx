"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { resumeHref, useContinueLearning } from "@/lib/moodle/hooks";

/**
 * "Continue learning" (mobile centre button): opens the same target as the
 * dashboard hero (useContinueLearning), else the dashboard.
 */
export default function ContinuePage() {
  const t = useT();
  const router = useRouter();
  const { target, loading } = useContinueLearning();

  useEffect(() => {
    if (!loading) router.replace(target ? resumeHref(target) : "/dashboard");
  }, [loading, target, router]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-subtle" aria-busy="true">
      <Loader2 size={28} className="animate-spin text-primary-text" />
      <p className="text-sm font-medium">{t("shell.continueLoading")}</p>
    </div>
  );
}
