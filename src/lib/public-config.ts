/**
 * Runtime config that client code needs (one build serves any school, so
 * nothing here may be inlined at build time).
 *
 * The root layout writes it into `window.__PORTAL_CONFIG__` before hydration
 * (see portalConfigScript); on the server it is read straight from env.
 */
interface PortalConfig {
  /** Moodle's public wwwroot as browsers see it, without trailing slash. */
  moodleUrl: string;
}

declare global {
  interface Window {
    __PORTAL_CONFIG__?: PortalConfig;
  }
}

const trimSlash = (url: string | undefined) => (url ?? "").trim().replace(/\/+$/, "");

/**
 * Server side: MOODLE_PUBLIC_URL when Moodle's public URL differs from the
 * internal MOODLE_URL the server talks to (e.g. behind Docker), else MOODLE_URL.
 * NEXT_PUBLIC_MOODLE_URL (the old build-time setting) is still honoured so
 * existing deployments keep working; it is read by key so Next doesn't inline it.
 */
export function portalConfigFromEnv(): PortalConfig {
  const legacy = process.env["NEXT_PUBLIC_MOODLE_URL"];
  return {
    moodleUrl:
      trimSlash(process.env.MOODLE_PUBLIC_URL) || trimSlash(legacy) || trimSlash(process.env.MOODLE_URL),
  };
}

/** Moodle public base URL, for deep links and recognising Moodle file URLs. */
export function moodleBase(): string {
  if (typeof window === "undefined") return portalConfigFromEnv().moodleUrl;
  return window.__PORTAL_CONFIG__?.moodleUrl ?? "";
}

/** Inline script for the root layout; `<` is escaped so the JSON can't close the tag. */
export function portalConfigScript(): string {
  return `window.__PORTAL_CONFIG__=${JSON.stringify(portalConfigFromEnv()).replace(/</g, "\\u003c")};`;
}
