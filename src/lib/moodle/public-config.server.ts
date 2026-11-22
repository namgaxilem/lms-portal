import "server-only";
// Imported for its side effect: applies the MOODLE_INSECURE_TLS opt-in (local
// self-signed Moodle) before the fetch below, exactly as for web service calls.
import "./client";
import { connection } from "next/server";
import { MOODLE_URL } from "./config";

/**
 * The part of Moodle's public site configuration the portal uses. Read with
 * tool_mobile_get_public_config, which needs no token (loginrequired=false,
 * ajax=true): admin/tool/mobile/db/services.php and classes/api.php
 * get_public_config() in Moodle 4.1 (same fields in 4.5).
 */
export interface MoodlePublicConfig {
  /** Custom "forgotten password" URL set by the admin (may be a mailto:); "" = Moodle's own page. */
  forgottenpasswordurl: string;
  /** Login instructions (formatted HTML, "" when not set). */
  authinstructions: string;
  /** Users may sign in with their email address instead of the username. */
  authloginviaemail: boolean;
  maintenanceenabled: boolean;
  /** Maintenance notice (formatted HTML, may be ""). */
  maintenancemessage: string;
}

const FUNCTION = "tool_mobile_get_public_config";
/**
 * How long a successful answer is reused. Short, because the maintenance flag
 * is time-sensitive (the call itself is cheap).
 */
const FRESH_MS = 60_000;
/** After a failure, wait this long before asking Moodle again. */
const RETRY_MS = 60_000;
const TIMEOUT_MS = 4_000;

const str = (v: unknown) => (typeof v === "string" ? v : "");
const flag = (v: unknown) => v === true || Number(v) === 1;

function parse(data: Record<string, unknown>): MoodlePublicConfig {
  return {
    forgottenpasswordurl: str(data.forgottenpasswordurl).trim(),
    authinstructions: str(data.authinstructions).trim(),
    authloginviaemail: flag(data.authloginviaemail),
    maintenanceenabled: flag(data.maintenanceenabled),
    maintenancemessage: str(data.maintenancemessage).trim(),
  };
}

/**
 * One call through lib/ajax/service-nologin.php, with the request format of
 * Moodle's core/ajax module: a JSON array of {index, methodname, args}; the
 * answer is an array of {error, data | exception}. Never throws.
 */
async function fetchPublicConfig(): Promise<MoodlePublicConfig | null> {
  if (!MOODLE_URL) return null;
  try {
    const res = await fetch(`${MOODLE_URL}/lib/ajax/service-nologin.php?info=${FUNCTION}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ index: 0, methodname: FUNCTION, args: {} }]),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: unknown = await res.json();
    const first = Array.isArray(json) ? (json[0] as { error?: unknown; data?: unknown; exception?: { errorcode?: string } }) : null;
    if (!first || first.error !== false || !first.data || typeof first.data !== "object") {
      throw new Error(first?.exception?.errorcode ?? "unexpected response");
    }
    return parse(first.data as Record<string, unknown>);
  } catch (e) {
    console.warn(`[moodle] ${FUNCTION} unavailable:`, e instanceof Error ? e.message : e);
    return null;
  }
}

let cached: { value: MoodlePublicConfig | null; expires: number } | null = null;
let inflight: Promise<MoodlePublicConfig | null> | null = null;

function refresh(): Promise<MoodlePublicConfig | null> {
  inflight ??= fetchPublicConfig()
    .then((fresh) => {
      // On failure keep serving the last good answer, if any.
      const value = fresh ?? cached?.value ?? null;
      cached = { value, expires: Date.now() + (fresh ? FRESH_MS : RETRY_MS) };
      return value;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * Moodle's public config, cached in this server process (stale-while-revalidate:
 * an expired answer is returned at once while a fresh one loads, except while
 * it says "maintenance", so the banner goes away as soon as maintenance ends).
 * Resolves to null when Moodle cannot be reached; callers must treat every
 * field as optional.
 */
export async function getMoodlePublicConfig(): Promise<MoodlePublicConfig | null> {
  // Request-time data: opt the caller out of prerendering here, outside the
  // try/catch below, so Next's dynamic-rendering signal is never swallowed.
  await connection();
  if (cached && Date.now() < cached.expires) return cached.value;
  const pending = refresh();
  const stale = cached?.value;
  return stale && !stale.maintenanceenabled ? stale : pending;
}
