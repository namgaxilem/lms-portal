"use client";
import { BookOpenText, ListChecks } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Card, CardHeader, IconTile, RichText } from "@/components/ui";
import type { Assignment, SubmissionStatus } from "@/lib/moodle/types";
import { FileList } from "@/components/FileList";

/** Assignment description, its attachments and the optional "activity instructions". */
export function InstructionsCard({ assignment: a, status }: { assignment: Assignment; status: SubmissionStatus | null }) {
  const t = useT();
  const data = status?.assignmentdata;
  const introFiles = a.introattachments?.length ? a.introattachments : (data?.attachments?.intro ?? []);
  const activity = data?.activity?.trim();
  const activityFiles = data?.attachments?.activity ?? [];

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-3">
            <IconTile icon={BookOpenText} tone="accent" size="sm" />
            {t("assignment.instructions")}
          </span>
        }
      />
      <div className="space-y-4 p-5">
        {a.intro?.trim() ? (
          <RichText html={a.intro} />
        ) : (
          <p className="text-sm text-subtle">{t("assignment.noInstructions")}</p>
        )}
        <FileList files={introFiles} />
        {(activity || activityFiles.length > 0) && (
          <div className="rounded-2xl bg-surface-2 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-[13px] font-bold text-muted">
              <ListChecks size={16} strokeWidth={1.85} aria-hidden />
              {t("assignment.activityInstructions")}
            </h3>
            {activity && <RichText html={activity} />}
            <FileList files={activityFiles} className="mt-3" />
          </div>
        )}
      </div>
    </Card>
  );
}
