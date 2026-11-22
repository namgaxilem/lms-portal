import "server-only";
import {
  MOODLE_SERVICE,
  REST_ENDPOINT,
  TOKEN_ENDPOINT,
  assertConfigured,
} from "./config";

// Local-dev convenience: trust a self-signed TLS cert (e.g. a https://localhost
// Moodle). Opt in with MOODLE_INSECURE_TLS=1 in .env.local. NEVER enable this in
// production — it disables certificate verification for the whole Node process.
if (process.env.MOODLE_INSECURE_TLS === "1") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

/** Error carrying Moodle's errorcode so callers can branch on it. */
export class MoodleError extends Error {
  errorcode?: string;
  constructor(message: string, errorcode?: string) {
    super(message);
    this.name = "MoodleError";
    this.errorcode = errorcode;
  }
}

type FlatParams = Record<string, string>;

/**
 * Moodle's REST format expects PHP-style nested keys:
 *   { courseids: [5, 6] }            -> courseids[0]=5&courseids[1]=6
 *   { options: [{ name, value }] }   -> options[0][name]=..&options[0][value]=..
 */
function flatten(value: unknown, prefix: string, out: FlatParams): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((v, i) =>
      flatten(v, prefix ? `${prefix}[${i}]` : String(i), out)
    );
  } else if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flatten(v, prefix ? `${prefix}[${k}]` : k, out);
    }
  } else if (typeof value === "boolean") {
    out[prefix] = value ? "1" : "0";
  } else {
    out[prefix] = String(value);
  }
}

async function postForm(url: string, fields: FlatParams): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new MoodleError(`Moodle HTTP ${res.status}`, String(res.status));
  }
  return res.json();
}

/** Exchange username/password for a web service token. */
export async function moodleLogin(
  username: string,
  password: string
): Promise<string> {
  assertConfigured();
  const json = (await postForm(TOKEN_ENDPOINT, {
    username,
    password,
    service: MOODLE_SERVICE,
  })) as { token?: string; error?: string; errorcode?: string };

  if (json.error) throw new MoodleError(json.error, json.errorcode);
  if (!json.token) throw new MoodleError("No token returned by Moodle");
  return json.token;
}

/**
 * Call any Moodle web service function with a token.
 *
 * Like the Moodle app, text is returned filtered (multilang, media, MathJax…),
 * and `lang` (the portal's UI language) makes Moodle-generated strings such as
 * activity date labels match it; Moodle ignores a language pack it doesn't have.
 * Pass `filter: false` for text a form edits and saves back: filter output
 * (one language of a multilang text, autolinks, emoticon images, media players)
 * must never be written back into Moodle.
 */
export async function moodleCall<T = unknown>(
  token: string,
  wsfunction: string,
  params: Record<string, unknown> = {},
  { lang, filter = true }: { lang?: string; filter?: boolean } = {}
): Promise<T> {
  assertConfigured();
  const flat: FlatParams = {};
  flatten(params, "", flat);

  const json = await postForm(REST_ENDPOINT, {
    wstoken: token,
    wsfunction,
    moodlewsrestformat: "json",
    moodlewssettingfilter: filter ? "1" : "0",
    ...(lang ? { moodlewssettinglang: lang } : {}),
    ...flat,
  });

  // Moodle reports errors as HTTP 200 with an `exception` field.
  if (json && typeof json === "object" && "exception" in json) {
    const err = json as { message?: string; errorcode?: string };
    throw new MoodleError(err.message ?? "Moodle error", err.errorcode);
  }
  return json as T;
}
