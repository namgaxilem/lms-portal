import { moodleClient } from "@/lib/client-api";
import { moduleRoute } from "@/lib/moodle/course-outline";
import { moodlePath, portalRouteForMoodleUrl } from "@/lib/moodle/links";
import type { NotificationsResult, PopupNotification } from "@/lib/moodle/types";

/* ---------------- Inbox change events ---------------- */

/** Window event fired whenever notification read-state changes in the portal. */
export const NOTIFICATIONS_CHANGED = "notifications:changed";
/** Window event fired when conversations are marked read (unread message badges should refresh). */
export const MESSAGES_CHANGED = "messages:changed";

function dispatch(name: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(name));
}

export function notifyNotificationsChanged() {
  dispatch(NOTIFICATIONS_CHANGED);
}

export function notifyMessagesChanged() {
  dispatch(MESSAGES_CHANGED);
}

/* ---------------- Recently loaded notifications ---------------- */

/*
 * Moodle has no get-notification-by-id web service. Lists remember what they
 * loaded so the detail page opens instantly after client-side navigation and
 * only pages through the user's notifications on a cold load. Keyed by user so
 * a later sign-in in the same tab never sees another account's entries.
 */
const RECENT_MAX = 200;
const recent = new Map<string, PopupNotification>();

export function rememberNotifications(userId: number, list: PopupNotification[]) {
  for (const n of list) {
    const key = `${userId}:${n.id}`;
    recent.delete(key);
    recent.set(key, n);
  }
  while (recent.size > RECENT_MAX) {
    const oldest = recent.keys().next().value;
    if (oldest === undefined) break;
    recent.delete(oldest);
  }
}

export function recentNotification(userId: number, id: number): PopupNotification | null {
  return recent.get(`${userId}:${id}`) ?? null;
}

/* ---------------- Web service calls ---------------- */

/** One page of the user's notifications, newest first (remembered for the detail page). */
export async function fetchNotifications(userId: number, offset: number, limit: number) {
  const res = await moodleClient<NotificationsResult>("message_popup_get_popup_notifications", {
    useridto: userId,
    newestfirst: 1,
    limit,
    offset,
  });
  const items = res?.notifications ?? [];
  rememberNotifications(userId, items);
  return { items, unread: res?.unreadcount ?? 0 };
}

/** Marks every notification read and tells the bell, sidebar and lists to refresh. */
export async function markAllNotificationsRead(userId: number) {
  await moodleClient("core_message_mark_all_notifications_as_read", { useridto: userId });
  notifyNotificationsChanged();
}

/* ---------------- Portal link for a notification ---------------- */

/** Fields of a notification's `customdata` JSON that drive routing. */
interface NotificationCustomdata {
  cmid?: unknown;
  courseid?: unknown;
  messagetype?: unknown;
}

/** Parses `customdata` defensively: absent, invalid or non-object JSON → {}. */
function parseCustomdata(n: Pick<PopupNotification, "customdata">): NotificationCustomdata {
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
 * First link in Moodle HTML that maps to a specific portal page. Course
 * completion notices, for example, carry no contexturl or course id, only a
 * course link in the body. The generic dashboard (site home links in footers)
 * is not a useful destination, so it is skipped.
 */
function firstPortalLink(html: string | null | undefined): string | null {
  if (!html) return null;
  for (const [, href] of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const route = portalRouteForMoodleUrl(href);
    if (route && route !== "/dashboard") return route;
  }
  return null;
}

/**
 * Maps a Moodle notification to the portal page that shows its subject.
 * Only ever returns internal routes, never a Moodle URL, or null when the
 * portal has no matching page.
 */
export function portalLinkFor(n: PopupNotification): string | null {
  const data = parseCustomdata(n);
  const ctx = moodlePath(n.contexturl);
  const modMatch = ctx?.path.match(/^\/mod\/([a-z0-9_]+)\/view\.php$/);
  const ctxModname = modMatch?.[1];
  const ctxCmid = modMatch && ctx ? toId(ctx.params.get("id")) : null;
  const cmid = toId(data.cmid) ?? ctxCmid;
  const courseid = toId(data.courseid);

  // Assignments: "new submission" notices only go to graders (mod/assign:grade)
  // → grading screen; everything else (receipts, feedback, reminders) → the
  // student assignment page.
  if (n.component === "mod_assign" || ctxModname === "assign") {
    const assignCmid = ctxModname === "assign" ? (ctxCmid ?? cmid) : cmid;
    if (assignCmid) {
      if (data.messagetype === "gradersubmissionupdated") {
        const user = toId(n.useridfrom);
        return `/teacher/grading/${assignCmid}${user ? `?user=${user}` : ""}`;
      }
      return `/assignments/${assignCmid}`;
    }
  }

  // An activity link (SCORM → player, anything else → activity page), also for
  // module notifications whose link is not a view page (forum posts → discuss.php).
  if (ctxCmid && ctxModname) return moduleRoute({ id: ctxCmid, modname: ctxModname }, courseid);
  if (cmid) return moduleRoute({ id: cmid, modname: n.component?.replace(/^mod_/, "") ?? "" }, courseid);

  return (
    portalRouteForMoodleUrl(n.contexturl) ??
    (courseid ? `/courses/${courseid}` : null) ??
    firstPortalLink(n.fullmessagehtml)
  );
}
