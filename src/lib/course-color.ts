import type { CSSProperties } from "react";

/**
 * Vivid palette for per-course colour identity (covers, rings, accents). It is
 * independent of the school brand so courses stay distinguishable whatever the
 * brand colours are. Pick by course id so a course keeps its colour everywhere.
 */
const PALETTE = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#10b981", // emerald
  "#0ea5e9", // sky
  "#f97316", // orange
  "#14b8a6", // teal
  "#d946ef", // fuchsia
  "#3b82f6", // blue
] as const;

export function courseColor(id: number): string {
  return PALETTE[Math.abs(Math.trunc(id)) % PALETTE.length];
}

/**
 * Inline style that sets `--course` for the course-colour utilities in
 * globals.css (bg-course, bg-course-soft, bg-course-gradient, text-course,
 * stroke-course, shadow-course).
 */
export function courseStyle(id: number, style?: CSSProperties): CSSProperties {
  return { ...style, ["--course" as string]: courseColor(id) };
}

/**
 * Solid course fill for small white text (buttons, pills): the course colour
 * darkened to at least 4.5:1 against white for every palette colour (amber,
 * the lightest, is 5.2:1). bg-course-gradient's light stop only suits large
 * text or text over HeroCard's scrim.
 */
export const COURSE_FILL =
  "bg-linear-to-r from-[color-mix(in_oklab,var(--course)_70%,black)] to-[color-mix(in_oklab,var(--course)_55%,black)] text-white";
