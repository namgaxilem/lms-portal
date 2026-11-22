"use client";
import { LoaderCircle, Send } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Button, Card, CardHeader, IconTile } from "@/components/ui";
import { ErrorList, StatementCheckbox } from "./FormParts";
import type { BusyAction } from "./SubmissionCard";

/** "Submit for grading" step for assignments that keep drafts. */
export function SubmitCard({
  statement,
  accepted,
  onAcceptedChange,
  errors,
  busy,
  onSubmit,
}: {
  /** Submission statement to accept first, or null when Moodle requires none. */
  statement: string | null;
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  errors: string[];
  busy: BusyAction | null;
  onSubmit: () => void;
}) {
  const t = useT();
  return (
    <Card className="ring-2 ring-primary/25">
      <CardHeader
        title={
          <span className="flex items-center gap-3">
            <IconTile icon={Send} tone="primary" solid size="sm" />
            {t("assignment.submit.title")}
          </span>
        }
        description={t("assignment.submit.hint")}
      />
      <div className="space-y-4 p-5">
        {statement && (
          <StatementCheckbox
            statement={statement}
            checked={accepted}
            onChange={onAcceptedChange}
            disabled={busy !== null}
          />
        )}
        <ErrorList errors={errors} />
        <div className="flex justify-end">
          {/* Left enabled without the statement: the press explains what is missing (a silently disabled button doesn't). */}
          <Button variant="gradient" onClick={onSubmit} disabled={busy !== null}>
            {busy === "submit" ? (
              <LoaderCircle size={16} strokeWidth={1.85} className="animate-spin" />
            ) : (
              <Send size={16} strokeWidth={1.85} />
            )}
            {t("assignment.submit.action")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
