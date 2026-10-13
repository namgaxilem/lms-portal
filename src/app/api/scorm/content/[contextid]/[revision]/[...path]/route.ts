import { MOODLE_URL, assertConfigured } from "@/lib/moodle/config";
import { proxyMoodleFile } from "@/lib/moodle/proxy";
import { getToken } from "@/lib/session";

/**
 * Same-origin proxy for unpacked SCORM package files:
 *   /api/scorm/content/{contextid}/{revision}/{path} →
 *   MOODLE/webservice/pluginfile.php/{contextid}/mod_scorm/content/{revision}/{path}
 *
 * Serving the SCO from our origin lets it reach the SCORM API object the player
 * page puts on `window` (parent frame), and keeps the token server-side. The URL
 * mirrors the package layout so relative links inside the package keep working.
 * Moodle still enforces access: the file is fetched with the user's own token.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/scorm/content/[contextid]/[revision]/[...path]">
) {
  const token = await getToken();
  if (!token) return new Response("Not authenticated", { status: 401 });

  const { contextid, revision, path } = await ctx.params;
  if (!/^\d+$/.test(contextid) || !/^\d+$/.test(revision)) {
    return new Response("Bad request", { status: 400 });
  }
  if (path.some((seg) => seg === ".." || seg === ".")) {
    return new Response("Bad request", { status: 400 });
  }

  assertConfigured();
  const filePath = path.map(encodeURIComponent).join("/");
  const url =
    `${MOODLE_URL}/webservice/pluginfile.php/${contextid}/mod_scorm/content/${revision}/${filePath}` +
    `?token=${encodeURIComponent(token)}`;

  // Content is immutable per revision (a package update bumps it), but it is
  // user-authorised, so only the browser may cache it.
  return proxyMoodleFile(request, url, { cacheControl: "private, max-age=86400, immutable" });
}
