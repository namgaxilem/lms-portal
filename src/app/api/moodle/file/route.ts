import { MOODLE_URL, assertConfigured } from "@/lib/moodle/config";
import { proxyMoodleFile } from "@/lib/moodle/proxy";
import { getToken } from "@/lib/session";

/**
 * Authenticated proxy for Moodle pluginfile URLs (submission files, feedback
 * files, course images, page/resource files…):
 *   /api/moodle/file?url=<moodle pluginfile url>[&download=1]
 *
 * Only pluginfile paths on our own Moodle are accepted; the token is added
 * server-side so it never reaches the browser, and Moodle still checks access
 * with the user's own token. Files are served as untrusted content (CSP
 * sandbox, active types forced to download) because they are user uploads
 * living on the portal origin.
 */
export async function GET(request: Request) {
  const token = await getToken();
  if (!token) return new Response("Not authenticated", { status: 401 });
  assertConfigured();

  const params = new URL(request.url).searchParams;
  let target: URL;
  try {
    target = new URL(params.get("url") ?? "");
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  // Moodle builds file URLs from its public wwwroot, which may differ from the
  // internal MOODLE_URL the server talks to.
  const base = [MOODLE_URL, process.env.NEXT_PUBLIC_MOODLE_URL]
    .filter((u): u is string => !!u)
    .map((u) => new URL(u))
    .find((b) => target.origin === b.origin && target.pathname.startsWith(`${b.pathname.replace(/\/+$/, "")}/`));
  if (!base) return new Response("Bad request", { status: 400 });
  // "/pluginfile.php/…", "/webservice/pluginfile.php/…" or "/tokenpluginfile.php/<token>/…".
  const rel = target.pathname.slice(base.pathname.replace(/\/+$/, "").length);
  const match = /^\/(?:webservice\/pluginfile\.php|pluginfile\.php|tokenpluginfile\.php\/[^/]+)(\/\d+\/.+)$/.exec(rel);
  if (!match || match[1].split("/").some((seg) => seg === ".." || seg === ".")) {
    return new Response("Bad request", { status: 400 });
  }

  const query = new URLSearchParams({ token });
  if (params.get("download") === "1") query.set("forcedownload", "1");
  const url = `${MOODLE_URL}/webservice/pluginfile.php${match[1]}?${query}`;

  return proxyMoodleFile(request, url, {
    cacheControl: "private, max-age=3600",
    untrusted: true,
  });
}
