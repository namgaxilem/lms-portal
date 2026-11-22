"use client";
import { Info, TriangleAlert } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { cn } from "@/components/ui";
import type { GradingIssue, NoticeKind } from "./types";

/** Blocking notices disable the form; warnings flag data the teacher must know about. */
const LEVEL: Record<NoticeKind, "blocking" | "warning" | "info"> = {
  notApplied: "blocking",
  advancedUnavailable: "blocking",
  advancedUnsupported: "blocking",
  gradeLocked: "warning",
  feedbackHidden: "warning",
  notDefined: "info",
  methodUnknown: "info",
  scaleUnavailable: "info",
};

const MESSAGE: Partial<Record<NoticeKind, string>> = { feedbackHidden: "grading.feedbackHidden" };

/** Notices caused by the grading service; the admin-only technical hint goes under the first of these. */
const SERVICE_KINDS: NoticeKind[] = ["notApplied", "advancedUnavailable", "methodUnknown", "scaleUnavailable"];

export function serviceNoticeIndex(kinds: NoticeKind[]) {
  return kinds.findIndex((k) => SERVICE_KINDS.includes(k));
}

const ADMIN_HINT: Record<GradingIssue, string> = {
  "no-token": "grading.notice.admin.noToken",
  "token-invalid": "grading.notice.admin.tokenInvalid",
  unavailable: "grading.notice.admin.unavailable",
};

/** Calm explanation for staff; the technical cause is only shown to site admins (details are in the server log). */
export function GradingNotice({
  id,
  kind,
  methodLabel,
  issue,
}: {
  id?: string;
  kind: NoticeKind;
  /** Translated method name for "advancedUnavailable" / "notDefined". */
  methodLabel: string;
  issue?: GradingIssue;
}) {
  const t = useT();
  const { user } = useSession();
  const level = LEVEL[kind];
  const Icon = level === "info" ? Info : TriangleAlert;

  return (
    <div
      id={id}
      role={level === "blocking" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-control p-3 text-[13px] leading-relaxed",
        level === "info" ? "bg-primary-soft" : "bg-warning-soft"
      )}
    >
      <Icon
        size={18}
        strokeWidth={1.85}
        aria-hidden
        className={cn("mt-0.5 shrink-0", level === "info" ? "text-primary-text" : "text-warning-text")}
      />
      <div className="space-y-1">
        <p className={cn("text-fg", level === "warning" && "font-medium")}>
          {t(MESSAGE[kind] ?? `grading.notice.${kind}`, { method: methodLabel })}
        </p>
        {issue && user.isSiteAdmin && <p className="text-xs text-muted">{t(ADMIN_HINT[issue])}</p>}
      </div>
    </div>
  );
}
