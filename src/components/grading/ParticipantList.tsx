"use client";
import { CalendarClock, Search, Users } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge, EmptyState, Input, Tabs, cn, type Tone } from "@/components/ui";
import type { AssignParticipant } from "@/lib/moodle/types";
import { participantName, type ParticipantFilter } from "./lib";

export interface ParticipantRow extends AssignParticipant {
  /** Formatted grade or null when ungraded. */
  gradeLabel: string | null;
}

/** Submission state → badge tone + i18n key. */
export function statusBadge(p: Pick<AssignParticipant, "submissionstatus" | "requiregrading" | "submitted">): {
  tone: Tone;
  key: string;
} {
  if (p.requiregrading) return { tone: "warning", key: "grading.status.needsGrading" };
  switch (p.submissionstatus) {
    case "submitted":
      return { tone: "success", key: "grading.status.submitted" };
    case "draft":
      return { tone: "primary", key: "grading.status.draft" };
    case "reopened":
      return { tone: "violet", key: "grading.status.reopened" };
    default:
      return p.submitted
        ? { tone: "success", key: "grading.status.submitted" }
        : { tone: "neutral", key: "grading.status.notSubmitted" };
  }
}

export function ParticipantList({
  rows,
  counts,
  filter,
  onFilter,
  query,
  onQuery,
  selectedId,
  onSelect,
}: {
  /** Already filtered + searched rows. */
  rows: ParticipantRow[];
  counts: Record<ParticipantFilter, number>;
  filter: ParticipantFilter;
  onFilter: (f: ParticipantFilter) => void;
  query: string;
  onQuery: (q: string) => void;
  selectedId?: number;
  onSelect: (id: number) => void;
}) {
  const t = useT();
  const tabs: ParticipantFilter[] = ["all", "needsGrading", "submitted", "notSubmitted"];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 px-4 pt-3">
        <Input
          icon={Search}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={t("grading.searchParticipants")}
        />
        <Tabs
          items={tabs.map((k) => ({ key: k, label: t(`grading.filter.${k}`), count: counts[k] }))}
          value={filter}
          onChange={onFilter}
        />
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto py-1">
        {rows.length === 0 ? (
          <li>
            <EmptyState compact icon={Users} title={t("grading.noParticipants")} />
          </li>
        ) : (
          rows.map((p) => {
            const name = participantName(p, t);
            const badge = statusBadge(p);
            const active = p.id === selectedId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  aria-current={active || undefined}
                  className={cn(
                    "flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-left transition-colors",
                    active
                      ? "border-primary bg-primary-soft"
                      : "border-transparent hover:bg-surface-2"
                  )}
                >
                  <UserAvatar id={p.id} name={name} src={p.profileimageurl} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-fg">
                      <span className="truncate">{name}</span>
                      {p.grantedextension && (
                        <CalendarClock
                          size={14}
                          strokeWidth={1.75}
                          className="shrink-0 text-primary-text"
                          aria-label={t("grading.extensionGranted")}
                        />
                      )}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Badge tone={badge.tone} className="h-5 px-1.5 text-[11px]">
                        {t(badge.key)}
                      </Badge>
                      {p.groupname && (
                        <span className="truncate text-[11px] text-subtle">{p.groupname}</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-medium tabular-nums",
                      p.gradeLabel ? "text-fg" : "text-subtle"
                    )}
                  >
                    {p.gradeLabel ?? "—"}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
