import { MOODLE_BASE } from "@/lib/public-config";

const PLUGINFILE = /\/(webservice\/pluginfile|pluginfile|tokenpluginfile)\.php\//;

/** True for a Moodle pluginfile URL that needs the authenticated proxy. */
export function isMoodleFile(url: string | null | undefined): url is string {
  return !!url && !!MOODLE_BASE && url.startsWith(MOODLE_BASE) && PLUGINFILE.test(url);
}

/**
 * Browser-usable URL for a Moodle file: pluginfile URLs go through
 * /api/moodle/file (token added server-side); anything else is returned as is.
 */
export function fileUrl(url: string | null | undefined, { download = false } = {}): string {
  if (!url) return "";
  if (!isMoodleFile(url)) return url;
  // Drop any token Moodle embedded; the proxy adds the user's own.
  const clean = url.replace(/([?&])token=[^&#]*&?/, "$1").replace(/[?&]$/, "");
  return `/api/moodle/file?url=${encodeURIComponent(clean)}${download ? "&download=1" : ""}`;
}
