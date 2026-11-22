"use client";
import { moodleClient } from "@/lib/client-api";
import { useKeyedAsync } from "@/lib/moodle/hooks";

export interface ActivityGroups {
  /** Effective group mode: 0 = none, 1 = separate groups, 2 = visible groups. */
  mode: number;
  /** Groups the user may grade in this activity. */
  groups: { id: number; name: string }[];
  /** May list every participant (visible groups, or moodle/site:accessallgroups). */
  canSeeAll: boolean;
}

const NO_GROUPS: ActivityGroups = { mode: 0, groups: [], canSeeAll: true };

async function loadGroups(cmid: number): Promise<ActivityGroups> {
  try {
    const { groupmode } = await moodleClient<{ groupmode: number }>("core_group_get_activity_groupmode", { cmid });
    if (!groupmode) return NO_GROUPS;
    const res = await moodleClient<{ groups: { id: number; name: string }[]; canaccessallgroups?: boolean }>(
      "core_group_get_activity_allowed_groups",
      { cmid }
    );
    return {
      mode: groupmode,
      groups: res.groups.map((g) => ({ id: g.id, name: g.name })),
      canSeeAll: groupmode === 2 || !!res.canaccessallgroups,
    };
  } catch {
    // Not allowlisted / older site: behave as before (all participants, groupid 0).
    return NO_GROUPS;
  }
}

/**
 * Group mode and the groups the user may grade. In separate-groups activities
 * a teacher without moodle/site:accessallgroups gets an empty participant list
 * for groupid 0, so the workspace must pass one of their groups instead.
 * Returns null while loading.
 */
export function useActivityGroups(cmid: number) {
  return useKeyedAsync(`groups:${cmid}`, () => loadGroups(cmid)).data;
}
