"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * Call a Moodle web service function through the authenticated proxy.
 * `keepalive` lets the request outlive the page (used to flush SCORM tracks on unload).
 */
export async function moodleClient<T = unknown>(
  wsfunction: string,
  args: Record<string, unknown> = {},
  { keepalive = false }: { keepalive?: boolean } = {}
): Promise<T> {
  const body = JSON.stringify({ wsfunction, args });
  const res = await fetch("/api/moodle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    // Browsers cap keepalive bodies at 64KB; fall back to a normal request above that.
    keepalive: keepalive && body.length < 60_000,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json.data as T;
}

interface State<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Fetch a web service function and track loading/error state. Re-runs whenever
 * `wsfunction` or the serialized `args` change. Pass `skip` to defer the call.
 */
export function useMoodle<T = unknown>(
  wsfunction: string,
  args: Record<string, unknown> = {},
  skip = false
) {
  const [state, setState] = useState<State<T>>({
    data: null,
    error: null,
    loading: !skip,
  });
  const argsKey = JSON.stringify(args);

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await moodleClient<T>(wsfunction, JSON.parse(argsKey));
      setState({ data, error: null, loading: false });
    } catch (e) {
      setState({ data: null, error: (e as Error).message, loading: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsfunction, argsKey]);

  useEffect(() => {
    if (skip) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ data: null, error: null, loading: false });
      return;
    }
    run();
  }, [run, skip]);

  return { ...state, reload: run };
}

/**
 * Upload files into the user's Moodle draft area via /api/moodle/upload.
 * Pass an existing `itemid` to add to that draft area. Returns the draft itemid.
 */
export async function uploadDraftFiles(files: File[], itemid = 0): Promise<number> {
  const form = new FormData();
  for (const f of files) form.append("file", f, f.name);
  form.set("itemid", String(itemid));
  const res = await fetch("/api/moodle/upload", { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Upload failed");
  return json.itemid as number;
}
