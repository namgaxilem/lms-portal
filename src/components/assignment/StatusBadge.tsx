"use client";
import { useT } from "@/i18n/I18nProvider";
import { Badge, type Tone } from "@/components/ui";

const TONES: Record<string, Tone> = {
  new: "neutral",
  draft: "warning",
  submitted: "primary",
  reopened: "violet",
};

/** Submission status pill (new | draft | submitted | reopened). */
export function StatusBadge({ status }: { status?: string }) {
  const t = useT();
  const key = status && status in TONES ? status : "new";
  return (
    <Badge tone={TONES[key]} dot>
      {t(`assignment.status.${key}`)}
    </Badge>
  );
}
