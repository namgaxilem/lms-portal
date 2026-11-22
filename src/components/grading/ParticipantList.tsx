"use client";
import { Select } from "antd";
import { CalendarClock, Search, Users } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge, EmptyState, Input, cn } from "@/components/ui";
import type { AssignParticipant } from "@/lib/moodle/types";
import { FILTERS, participantName, statusBadge, type ParticipantFilter } from "./lib";
import type { ActivityGroups } from "./useActivityGroups";

export interface ParticipantRow extends AssignParticipant {
  /** Formatted grade or null when ungraded. */
  gradeLabel: string | null;
}

/** Group picker shown when the activity uses groups. 0 = all participants. */
function GroupPicker({
  groups,
  value,
  onChange,
}: {
  groups: ActivityGroups;
  value: number;
  onChange: (groupid: number) => void;
}) {
  const t = useT();
  return (
    <Select<number>
      className="w-full"
      aria-label={t("grading.group")}
      value={value}
      onChange={onChange}
      options={[
        ...(groups.canSeeAll ? [{ value: 0, label: t("grading.groups.all") }] : []),
        ...groups.groups.map((g) => ({ value: g.id, label: g.name })),
      ]}
    />
  );
}

/**
 * Status filters as a 2 × 2 grid of toggle buttons: four labelled tabs with
 * counts don't fit the 320px sidebar / drawer, and a scrolling tab bar would hide some.
 */
function FilterGrid({
  counts,
  value,
  onChange,
}: {
  counts: Record<ParticipantFilter, number>;
  value: ParticipantFilter;
  onChange: (f: ParticipantFilter) => void;
}) {
  const t = useT();
  return (
    <div role="group" aria-label={t("grading.statusLabel")} className="grid grid-cols-2 gap-1.5">
      {FILTERS.map((f) => {
        const active = f === value;
        return (
          <button
            key={f}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(f)}
            className={cn(
              "flex min-w-0 items-center justify-between gap-2 rounded-control border px-2.5 py-1.5 text-left text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active
                ? "border-primary/40 bg-primary-soft text-primary-text"
                : "border-line text-muted hover:border-line-strong hover:text-fg"
            )}
          >
            <span className="truncate">{t(`grading.filter.${f}`)}</span>
            <span className="shrink-0 tabular-nums">{counts[f]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Search, group + status filters and the participant buttons (sidebar and mobile drawer). */
export function ParticipantList({
  rows,
  counts,
  filter,
  onFilter,
  query,
  onQuery,
  selectedId,
  onSelect,
  groups,
  groupid,
  onGroup,
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
  groups: ActivityGroups | null;
  groupid: number;
  onGroup: (groupid: number) => void;
}) {
  const t = useT();
  const showGroups = !!groups && groups.mode > 0 && groups.groups.length > 0;
  const noGroup = !!groups && groups.mode > 0 && !groups.canSeeAll && groups.groups.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2.5 px-3 pt-3">
        {showGroups && <GroupPicker groups={groups} value={groupid} onChange={onGroup} />}
        <Input
          icon={Search}
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={t("grading.searchParticipants")}
          aria-label={t("grading.searchParticipants")}
        />
        <FilterGrid counts={counts} value={filter} onChange={onFilter} />
      </div>
      <div className="mt-1 min-h-0 flex-1 overflow-y-auto">
        <ul className="space-y-0.5 p-2" aria-label={t("grading.participants")}>
          {rows.length === 0 ? (
            <li>
              <EmptyState
                compact
                icon={Users}
                title={t("grading.noParticipants")}
                hint={noGroup ? t("grading.groups.none") : undefined}
              />
            </li>
          ) : (
            rows.map((p) => (
              <li key={p.id}>
                <ParticipantButton row={p} active={p.id === selectedId} onSelect={onSelect} />
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

function ParticipantButton({
  row: p,
  active,
  onSelect,
}: {
  row: ParticipantRow;
  active: boolean;
  onSelect: (id: number) => void;
}) {
  const t = useT();
  const name = participantName(p, t);
  const badge = statusBadge(p);
  return (
    <button
      type="button"
      onClick={() => onSelect(p.id)}
      aria-current={active || undefined}
      className={cn(
        "relative flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
        active ? "bg-primary-soft" : "hover:bg-surface-2"
      )}
    >
      {active && <span aria-hidden className="absolute inset-y-2 left-0 w-1 rounded-full bg-primary" />}
      <UserAvatar id={p.id} name={name} src={p.profileimageurl} size={34} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
          <span className="truncate">{name}</span>
          {p.grantedextension && (
            <CalendarClock
              size={14}
              strokeWidth={1.85}
              className="shrink-0 text-primary-text"
              aria-label={t("grading.extensionGranted")}
            />
          )}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Badge tone={badge.tone}>{t(badge.key)}</Badge>
          {p.groupname && <span className="truncate text-[11px] text-subtle">{p.groupname}</span>}
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
          p.gradeLabel ? "bg-success-soft text-success-text" : "text-subtle"
        )}
      >
        {p.gradeLabel ?? "—"}
      </span>
    </button>
  );
}
