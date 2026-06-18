/**
 * Client-safe config. Only NEXT_PUBLIC_* vars are available in the browser.
 * Used for deep links into the Moodle site (e.g. opening the grading screen).
 */
export const MOODLE_BASE = (
  process.env.NEXT_PUBLIC_MOODLE_URL ?? ""
).replace(/\/+$/, "");
