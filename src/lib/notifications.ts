import { moodlePath } from "@/lib/moodle/links";
import type { PopupNotification } from "@/lib/moodle/types";

/** Fields Moodle core/plugins put in a notification's `customdata` JSON. */
export interface NotificationCustomdata {
  cmid?: number;
  instance?: number;
  courseid?: number;
  messagetype?: string;
  discussionid?: number;
  postid?: number;
  assignmentid?: number;
  duedate?: number;
  [key: string]: unknown;
}

/** Window event fired whenever notification read-state changes in the portal. */
export const NOTIFICATIONS_CHANGED = "notifications:changed";

export function notifyNotificationsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
  }
}

/** Parses `customdata` defensively: absent, invalid or non-object JSON → {}. */
export function parseCustomdata(n: Pick<PopupNotification, "customdata">): NotificationCustomdata {
  if (!n.customdata) return {};
  try {
    const parsed: unknown = JSON.parse(n.customdata);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as NotificationCustomdata)
      : {};
  } catch {
    return {};
  }
}

/** Positive integer from a number or numeric string, else null. */
function toId(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Maps a Moodle notification to the portal page that shows its subject.
 * Only ever returns internal routes — never a Moodle URL — or null when the
 * portal has no matching page.
 */
export function portalLinkFor(
  n: PopupNotification,
  /** Staff (teacher/admin) account, regardless of the student/teacher view toggle. */
  isStaff: boolean
): string | null {
  const data = parseCustomdata(n);
  const ctx = moodlePath(n.contexturl);
  const modMatch = ctx?.path.match(/^\/mod\/([a-z0-9_]+)\/view\.php$/);
  const ctxModname = modMatch?.[1];
  const ctxCmid = modMatch ? toId(ctx!.params.get("id")) : null;
  const cmid = toId(data.cmid) ?? ctxCmid;

  // Assignments: "new submission" notices only go to graders → grading screen;
  // everything else (receipts, feedback, reminders) → the student assignment page.
  if (n.component === "mod_assign" || ctxModname === "assign") {
    const assignCmid = ctxModname === "assign" ? (ctxCmid ?? cmid) : (cmid ?? null);
    if (assignCmid) {
      if (data.messagetype === "gradersubmissionupdated" && isStaff) {
        const user = toId(n.useridfrom);
        return `/teacher/grading/${assignCmid}${user ? `?user=${user}` : ""}`;
      }
      return `/assignments/${assignCmid}`;
    }
  }

  if (ctxModname === "scorm" && ctxCmid) return `/scorm/${ctxCmid}`;
  if (ctxModname && ctxCmid) return `/activity/${ctxCmid}`;
  if (n.component === "mod_scorm" && cmid) return `/scorm/${cmid}`;
  // Forum posts (discuss.php) and any other module notification carrying a cmid.
  if (cmid) return `/activity/${cmid}`;

  if (ctx) {
    if (ctx.path === "/course/view.php") {
      const id = toId(ctx.params.get("id"));
      if (id) return `/courses/${id}`;
    }
    if (ctx.path === "/message/index.php") {
      const uid = toId(ctx.params.get("id")) ?? toId(ctx.params.get("user2"));
      return uid ? `/messages/${uid}` : "/messages";
    }
    if (ctx.path.startsWith("/grade/report/")) return "/grades";
  }

  const courseid = toId(data.courseid);
  if (courseid) return `/courses/${courseid}`;
  return null;
}
