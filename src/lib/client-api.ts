"use client";
import { useCallback, useEffect, useState } from "react";

/** Call a Moodle web service function through the authenticated proxy. */
export async function moodleClient<T = unknown>(
  wsfunction: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch("/api/moodle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wsfunction, args }),
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
