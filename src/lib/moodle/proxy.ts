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

/**
 * Moodle writes the file name into Content-Disposition as raw UTF-8
 * (filelib send_file), which fetch() reads as Latin-1, so non-ASCII names
 * (Vietnamese!) would reach the browser garbled. Rebuild the header in the
 * RFC 6266 form: ASCII fallback + filename*=UTF-8''<percent-encoded>.
 */
function normalizeDisposition(raw: string): string {
  const utf8 = Buffer.from(raw, "latin1").toString("utf8");
  const type = /^\s*(inline|attachment)/i.exec(utf8)?.[1]?.toLowerCase() ?? "inline";
  const name = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(utf8)?.[1];
  if (!name) return type;
  let decoded = name;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    // Not percent-encoded: use as is.
  }
  const ascii = decoded
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(decoded)}`;
}

/** Types that could run script if rendered as a document on our origin. */
const ACTIVE_TYPES = /^(text\/html|application\/xhtml\+xml|text\/xml|application\/xml|image\/svg\+xml)/i;

interface ProxyOptions {
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

  // Give up if Moodle hasn't started answering in 30s. The timer only covers
  // the response headers, so long downloads/streams are not cut off; the
  // browser going away aborts the upstream request too.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  request.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  let upstream: Response;
  try {
    upstream = await fetch(url, { headers, cache: "no-store", redirect: "follow", signal: ctrl.signal });
  } catch {
    return new Response("Moodle unreachable", { status: 502 });
  } finally {
    clearTimeout(timer);
  }

  const out = new Headers();
  for (const name of FORWARD_RESPONSE) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  const disposition = upstream.headers.get("content-disposition");
  if (disposition) out.set("content-disposition", normalizeDisposition(disposition));
  // fetch() already decoded a compressed body, so Moodle's length is wrong for it.
  if (upstream.headers.get("content-encoding")) out.delete("content-length");
  // A 304 revalidation must keep the browser's cached copy (no-store would evict it).
  out.set("cache-control", upstream.ok || upstream.status === 304 ? cacheControl : "no-store");

  if (untrusted) {
    const type = upstream.headers.get("content-type") ?? "";
    out.set("x-content-type-options", "nosniff");
    // Chrome's PDF viewer refuses to render in a sandboxed document; PDFs run
    // in the isolated viewer anyway, so only they skip the sandbox.
    if (!/^application\/pdf/i.test(type)) out.set("content-security-policy", "sandbox");
    if (ACTIVE_TYPES.test(type)) {
      const current = out.get("content-disposition") ?? "";
      out.set("content-disposition", current.replace(/^inline/i, "attachment") || "attachment");
    }
  }

  return new Response(upstream.body, { status: upstream.status, headers: out });
}
