import "server-only";
// Importing the WS client applies the MOODLE_INSECURE_TLS dev opt-in.
import "./client";

/** Request headers forwarded to Moodle (range requests keep video/audio seekable). */
const FORWARD_REQUEST = ["range", "if-none-match", "if-modified-since"];

/** Response headers passed back to the browser. */
const FORWARD_RESPONSE = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "content-disposition",
  "etag",
  "last-modified",
];

/** Types that could run script if rendered as a document on our origin. */
const ACTIVE_TYPES = /^(text\/html|application\/xhtml\+xml|text\/xml|application\/xml|image\/svg\+xml)/i;

export interface ProxyOptions {
  /** Cache-Control for successful responses. */
  cacheControl: string;
  /**
   * Treat the file as untrusted user content: sandbox it (no script, opaque
   * origin) and force active document types to download. SCORM content must
   * NOT be sandboxed — it needs the SCORM API on the parent window.
   */
  untrusted?: boolean;
}

/** Stream a Moodle file (already token-signed `url`) back to the browser. */
export async function proxyMoodleFile(
  request: Request,
  url: string,
  { cacheControl, untrusted = false }: ProxyOptions
): Promise<Response> {
  const headers = new Headers();
  for (const name of FORWARD_REQUEST) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, { headers, cache: "no-store", redirect: "follow" });
  } catch {
    return new Response("Moodle unreachable", { status: 502 });
  }

  const out = new Headers();
  for (const name of FORWARD_RESPONSE) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  out.set("cache-control", upstream.ok ? cacheControl : "no-store");

  if (untrusted) {
    const type = upstream.headers.get("content-type") ?? "";
    out.set("x-content-type-options", "nosniff");
    // Chrome's PDF viewer refuses to render in a sandboxed document; PDFs run
    // in the isolated viewer anyway, so only they skip the sandbox.
    if (!/^application\/pdf/i.test(type)) out.set("content-security-policy", "sandbox");
    if (ACTIVE_TYPES.test(type)) {
      const disposition = upstream.headers.get("content-disposition") ?? "";
      out.set("content-disposition", disposition.replace(/^inline/i, "attachment") || "attachment");
    }
  }

  return new Response(upstream.body, { status: upstream.status, headers: out });
}
