import { MOODLE_BASE } from "@/lib/public-config";

const id = (v: string | null) => (v && /^\d+$/.test(v) ? v : null);

/** Parse a URL on our Moodle site into its path (relative to wwwroot) + query. */
export function moodlePath(url: string | null | undefined) {
  if (!url || !MOODLE_BASE) return null;
  try {
    const u = new URL(url.replace(/&amp;/g, "&"));
    const base = new URL(MOODLE_BASE);
    const basePath = base.pathname.replace(/\/+$/, "");
    if (u.origin !== base.origin || !u.pathname.startsWith(`${basePath}/`)) return null;
    return { path: u.pathname.slice(basePath.length), params: u.searchParams };
  } catch {
    return null;
  }
}

/**
 * Portal route for a link into the Moodle website, or null when the portal has
 * no equivalent page. Used so rich text (notifications, pages, feedback) never
 * sends users to the Moodle UI.
 */
export function portalRouteForMoodleUrl(url: string | null | undefined): string | null {
  const ctx = moodlePath(url);
  if (!ctx) return null;
  const { path, params } = ctx;

  const mod = path.match(/^\/mod\/([a-z0-9_]+)\/view\.php$/);
  if (mod) {
    const cmid = id(params.get("id"));
    if (!cmid) return null;
    if (mod[1] === "scorm") return `/scorm/${cmid}`;
    // /activity dispatches by role (assign → grading for teachers, submission page for students).
    return `/activity/${cmid}`;
  }
  if (path === "/course/view.php") {
    const course = id(params.get("id"));
    return course ? `/courses/${course}` : "/courses";
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
  if (path.startsWith("/grade/report/")) return "/grades";
  if (path === "/my/" || path === "/my/index.php" || path === "/") return "/dashboard";
  return null;
}
