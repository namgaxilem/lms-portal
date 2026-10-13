"use client";
import { useCallback, useEffect, useState } from "react";
import type {
  AssignGradesResult,
  AssignParticipant,
  Assignment,
  GradingMeta,
  SubmissionStatus,
} from "@/lib/moodle/types";

export type ParticipantFilter = "all" | "needsGrading" | "submitted" | "notSubmitted";

export const WORKFLOW_STATES = [
  "notmarked",
  "inmarking",
  "readyforreview",
  "inreview",
  "readyforrelease",
  "released",
] as const;

/** Latest-attempt grade per user id (raw Moodle string). */
export function latestGrades(result: AssignGradesResult | null, assignid: number) {
  const map = new Map<number, { grade: string; attemptnumber: number }>();
  const grades = result?.assignments.find((a) => a.assignmentid === assignid)?.grades ?? [];
  for (const g of grades) {
    const cur = map.get(g.userid);
    if (!cur || g.attemptnumber >= cur.attemptnumber) map.set(g.userid, g);
  }
  return map;
}

/** Parses a raw Moodle grade ("-1.00000" / "" = not graded). */
export function parseGrade(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Human grade: scale label, "x / max" points, or null when ungraded. */
export function formatGrade(
  raw: string | null | undefined,
  assignment: Pick<Assignment, "grade">,
  scale: string[] | null | undefined
): string | null {
  const n = parseGrade(raw);
  if (n === null) return null;
  if (assignment.grade < 0) {
    const label = scale?.[Math.round(n) - 1];
    return label ?? String(Math.round(n));
  }
  return `${formatNumber(n)} / ${formatNumber(assignment.grade)}`;
}

export function formatNumber(n: number) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export function matchesFilter(p: AssignParticipant, f: ParticipantFilter) {
  if (f === "needsGrading") return p.requiregrading;
  if (f === "submitted") return p.submitted;
  if (f === "notSubmitted") return !p.submitted;
  return true;
}

/** Display name; blind marking hides names and only returns a participant number. */
export function participantName(
  p: Pick<AssignParticipant, "fullname" | "recordid" | "id">,
  t: (k: string, p?: Record<string, string | number>) => string
) {
  if (p.fullname) return p.fullname;
  return t("grading.participantNo", { n: p.recordid && p.recordid > 0 ? p.recordid : p.id });
}

/** The submission the teacher grades: the team one for group assignments. */
export function currentSubmission(status: SubmissionStatus | null, team: boolean) {
  const last = status?.lastattempt;
  return (team ? last?.teamsubmission : last?.submission) ?? last?.submission ?? null;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Moodle HTML feedback → plain text for the textarea (keeps paragraph/line breaks). */
export function htmlToText(html: string | null | undefined) {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, code: string) => {
      if (code[0] === "#") {
        const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
        return Number.isFinite(n) ? String.fromCodePoint(n) : m;
      }
      return ENTITIES[code.toLowerCase()] ?? m;
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Plain textarea text → simple HTML paragraphs (blank line = new paragraph). */
export function textToHtml(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\n\s*\n/)
    .map((para) => `<p>${escapeHtml(para.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function formatBytes(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDateTime(unix: number | null | undefined, locale: string) {
  if (!unix) return "—";
  return new Date(unix * 1000).toLocaleString(locale === "vi" ? "vi-VN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Fetch keyed by `key`: data from a previous key is never returned, so
 * consumers can't render one student's data under another. `reload` keeps the
 * current data visible while refreshing. Pass key null to skip.
 */
export function useKeyedFetch<T>(key: string | null, fetcher: () => Promise<T>) {
  const [state, setState] = useState<{ key: string | null; data: T | null; error: string | null }>({
    key: null,
    data: null,
    error: null,
  });

  // The fetcher closes over the values encoded in `key`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fetcher, [key]);

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    run().then(
      (data) => !cancelled && setState({ key, data, error: null }),
      (e: Error) => !cancelled && setState({ key, data: null, error: e.message })
    );
    return () => {
      cancelled = true;
    };
  }, [key, run]);

  const reload = useCallback(async () => {
    if (key === null) return;
    try {
      const data = await run();
      setState((s) => (s.key === key ? { key, data, error: null } : s));
    } catch (e) {
      setState((s) => (s.key === key ? { ...s, error: (e as Error).message } : s));
    }
  }, [key, run]);

  const current = key !== null && state.key === key;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: key !== null && !current,
    reload,
  };
}

/** GET /api/grading/{cmid}[?userid=] */
export async function fetchGradingMeta(cmid: number, userid?: number): Promise<GradingMeta> {
  const res = await fetch(`/api/grading/${cmid}${userid ? `?userid=${userid}` : ""}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json.data as GradingMeta;
}

/** inputClass without fixed size / font size, so callers can size fields freely. */
export const fieldClass =
  "rounded-lg border border-line bg-surface px-3 text-fg outline-none transition-[border-color,box-shadow] placeholder:text-subtle hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-ring/30 disabled:opacity-60";
