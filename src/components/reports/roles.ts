import type { Tone } from "@/components/ui";
import type { UserRole } from "@/lib/moodle/types";

/**
 * Display name of a course role: a custom name set in Moodle wins, then our
 * translation of the standard shortname, then the raw shortname.
 */
export function roleLabel(role: UserRole, t: (key: string) => string): string {
  if (role.name?.trim()) return role.name.trim();
  const key = `moodleRole.${role.shortname}`;
  const label = t(key);
  return label === key ? role.shortname : label;
}

const ROLE_TONE: Record<string, Tone> = {
  student: "neutral",
  guest: "neutral",
  editingteacher: "primary",
  teacher: "primary",
  manager: "violet",
  coursecreator: "violet",
};

/** Badge tone for a course role; custom roles (e.g. study advisers) use accent. */
export function roleTone(role: UserRole): Tone {
  return ROLE_TONE[role.shortname] ?? "accent";
}
