import { fileUrl, isMoodleFile } from "@/lib/moodle/files";
import { portalRouteForMoodleUrl } from "@/lib/moodle/links";
import { moodleBase } from "@/lib/public-config";

export type LinkTarget =
  /** A Moodle page the portal has its own route for. */
  | { kind: "internal"; href: string }
  /** A website, opened in a new tab. */
  | { kind: "external"; href: string; host: string }
  /** mailto:, tel: or an app scheme (zoommtg:, msteams:…): handed to the device, no new tab. */
  | { kind: "app"; href: string; detail: string; email: boolean }
  /** Unparseable, or a scheme that runs code or reads local data. */
  | { kind: "invalid" };

/** Never followed: these run script or read local/browser data instead of opening a resource. */
const BLOCKED_PROTOCOLS = new Set(["javascript:", "vbscript:", "data:", "blob:", "file:", "filesystem:", "about:"]);
const WEB_PROTOCOLS = new Set(["http:", "https:"]);

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Where a mod_url externalurl should take the user. Moodle accepts any scheme
 * and root-relative URLs ("/mod/…"), which browsers resolve against Moodle's
 * origin, so they are resolved the same way here instead of against the
 * portal; a value without a scheme gets "http://" like Moodle's
 * url_fix_submitted_url() adds on save.
 */
export function resolveLinkTarget(raw: string): LinkTarget {
  const value = raw.trim();
  const base = moodleBase();
  let url: URL;
  try {
    if (value.startsWith("/")) {
      if (!base) return { kind: "invalid" };
      url = new URL(value, base);
    } else {
      url = new URL(/^[a-z]+:/i.test(value) ? value : `http://${value}`);
    }
  } catch {
    return { kind: "invalid" };
  }
  if (BLOCKED_PROTOCOLS.has(url.protocol)) return { kind: "invalid" };

  if (!WEB_PROTOCOLS.has(url.protocol)) {
    const email = url.protocol === "mailto:";
    const detail = email || url.protocol === "tel:" ? safeDecode(url.pathname) : url.href;
    return { kind: "app", href: url.href, detail, email };
  }

  const route = portalRouteForMoodleUrl(url.href);
  if (route) return { kind: "internal", href: route };
  return { kind: "external", href: isMoodleFile(url.href) ? fileUrl(url.href) : url.href, host: url.hostname };
}
