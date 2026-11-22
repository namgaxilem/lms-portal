import { moduleRoute } from "@/lib/moodle/course-outline";
import { moodleBase } from "@/lib/public-config";

const id = (v: string | null) => (v && /^\d+$/.test(v) ? v : null);

/** Parse an absolute URL on our Moodle site into its path (relative to wwwroot) + query + hash. */
export function moodlePath(url: string | null | undefined) {
  const root = moodleBase();
  if (!url || !root) return null;
  try {
    const u = new URL(url.replace(/&amp;/g, "&"));
    const base = new URL(root);
    const basePath = base.pathname.replace(/\/+$/, "");
    if (u.origin !== base.origin) return null;
    // wwwroot itself may be linked without its trailing slash.
    if (u.pathname !== basePath && !u.pathname.startsWith(`${basePath}/`)) return null;
    return { path: u.pathname.slice(basePath.length) || "/", params: u.searchParams, hash: u.hash };
  } catch {
    return null;
  }
}

/** "YYYY-MM" (the /calendar ?month= format) of a unix timestamp, in local time. */
function monthOf(unix: string | null): string | null {
  const t = id(unix);
  if (!t) return null;
  const d = new Date(Number(t) * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Portal route for a link into the Moodle website, or null when the portal has
 * no equivalent page. Used so rich text (notifications, pages, feedback) and
 * URL activities never send users to the Moodle UI when the portal has the page.
 */
export function portalRouteForMoodleUrl(url: string | null | undefined): string | null {
  const ctx = moodlePath(url);
  if (!ctx) return null;
  const { path, params, hash } = ctx;

  const mod = path.match(/^\/mod\/([a-z0-9_]+)\/view\.php$/);
  if (mod) {
    const cmid = id(params.get("id"));
    // SCORM → player; /activity dispatches the rest (assign → grading or
    // submission page by capability, labels and subsections → their course page…).
    return cmid ? moduleRoute({ id: Number(cmid), modname: mod[1] }) : null;
  }
  if (path === "/course/view.php") {
    const course = id(params.get("id"));
    if (!course) return "/courses";
    // Section links: ?section=N or #section-N (the course page resolves both).
    const section = id(params.get("section")) ?? hash.match(/^#section-(\d+)$/)?.[1] ?? null;
    return section ? `/courses/${course}#section-${section}` : `/courses/${course}`;
  }
  // Activity index of a course, e.g. /mod/assign/index.php?id={courseid}.
  if (/^\/mod\/[a-z0-9_]+\/index\.php$/.test(path)) {
    const course = id(params.get("id"));
    return course ? `/courses/${course}` : null;
  }
  if (path === "/message/index.php") {
    const user = id(params.get("id")) ?? id(params.get("user2"));
    return user ? `/messages/${user}` : "/messages";
  }
  if (path === "/message/output/popup/notifications.php") {
    const notification = id(params.get("notificationid"));
    return notification ? `/notifications/${notification}` : "/notifications";
  }
  if (path === "/grade/report/user/index.php" || path === "/course/user.php") {
    const course = id(params.get("id"));
    return course ? `/grades?course=${course}` : "/grades";
  }
  if (path.startsWith("/grade/report/")) return "/grades";
  if (path === "/calendar/view.php") {
    const month = monthOf(params.get("time"));
    return month ? `/calendar?month=${month}` : "/calendar";
  }
  if (path === "/my/courses.php") return "/courses";
  if (path === "/my/" || path === "/my/index.php" || path === "/" || path === "/index.php") return "/dashboard";
  return null;
}
