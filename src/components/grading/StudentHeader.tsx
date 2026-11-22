"use client";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge, Button, Card } from "@/components/ui";
import { participantName, statusBadge } from "./lib";
import type { ParticipantRow } from "./ParticipantList";

/** Selected student with status, plus previous / next and (below lg) the participant drawer button. */
export function StudentHeader({
  row,
  total,
  onOpenList,
  onPrev,
  onNext,
}: {
  row: ParticipantRow | undefined;
  total: number;
  onOpenList: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const t = useT();
  const badge = row ? statusBadge(row) : null;
  const name = row ? participantName(row, t) : "";

  return (
    <Card className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
      <Button
        variant="secondary"
        size="sm"
        className="lg:hidden"
        onClick={onOpenList}
        aria-label={`${t("grading.participants")} (${total})`}
      >
        <Users size={16} strokeWidth={1.85} />
        <span className="tabular-nums">{total}</span>
      </Button>
      {row && badge ? (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="hidden sm:block">
            <UserAvatar id={row.id} name={name} src={row.profileimageurl} size={40} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-fg">{name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <Badge tone={badge.tone}>{t(badge.key)}</Badge>
              {row.grantedextension && <Badge tone="primary">{t("grading.extensionGranted")}</Badge>}
              {row.groupname && <span className="truncate text-xs text-subtle">{row.groupname}</span>}
            </div>
          </div>
        </div>
      ) : (
        <p className="flex-1 text-sm text-subtle">{t("grading.noParticipants")}</p>
      )}
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon-sm" disabled={!onPrev} onClick={onPrev} aria-label={t("grading.previous")}>
          <ChevronLeft size={18} strokeWidth={1.85} />
        </Button>
        <Button variant="ghost" size="icon-sm" disabled={!onNext} onClick={onNext} aria-label={t("grading.next")}>
          <ChevronRight size={18} strokeWidth={1.85} />
        </Button>
      </div>
    </Card>
  );
}
