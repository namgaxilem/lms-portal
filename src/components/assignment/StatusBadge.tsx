"use client";
import type { LucideIcon } from "lucide-react";
import { Circle, CircleCheck, PencilLine, RotateCcw } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Badge, type Tone } from "@/components/ui";

interface StatusMeta {
  /** i18n key under assignment.status.* */
  key: string;
  tone: Tone;
  icon: LucideIcon;
}

const STATUS: Record<string, StatusMeta> = {
  new: { key: "assignment.status.new", tone: "neutral", icon: Circle },
  draft: { key: "assignment.status.draft", tone: "warning", icon: PencilLine },
  submitted: { key: "assignment.status.submitted", tone: "primary", icon: CircleCheck },
  reopened: { key: "assignment.status.reopened", tone: "violet", icon: RotateCcw },
};

/** Label, tone and icon for a submission status (new | draft | submitted | reopened). */
export function submissionStatusMeta(status?: string): StatusMeta {
  return (status && STATUS[status]) || STATUS.new;
}

/** Submission status pill for light surfaces. */
export function StatusBadge({ status }: { status?: string }) {
  const t = useT();
  const meta = submissionStatusMeta(status);
  return (
    <Badge tone={meta.tone} dot>
      {t(meta.key)}
    </Badge>
  );
}
