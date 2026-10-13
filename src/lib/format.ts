import type { AccountRole, SessionUser } from "@/lib/moodle/types";

/** Strips HTML tags from Moodle rich-text fields. */
export function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").trim();
}

/** Up to two initials: first + last word ("Nguyen Van An" → "NA"). */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Compact relative time from a unix timestamp (seconds): now, 5m, 3h, 2d. */
export function timeAgo(unix: number) {
  const m = (Date.now() / 1000 - unix) / 60;
  if (m < 1) return "now";
  if (m < 60) return `${Math.floor(m)}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  if (m < 43200) return `${Math.floor(m / 1440)}d`;
  return new Date(unix * 1000).toLocaleDateString();
}

/** True when the unix timestamp (seconds) falls on the current calendar day. */
export function isToday(unix: number) {
  const d = new Date(unix * 1000);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

/** Highest account role, falling back for sessions created before highestRole existed. */
export function accountRole(
  user: Pick<SessionUser, "highestRole" | "isSiteAdmin"> | null | undefined
): AccountRole {
  return user?.highestRole ?? (user?.isSiteAdmin ? "admin" : "student");
}

export function isStaffRole(role: AccountRole) {
  return role === "admin" || role === "teacher";
}
