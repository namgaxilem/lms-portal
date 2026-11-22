/**
 * Small colour toolkit for deriving UI colours from a school's brand colours:
 * perceptual mixing in OKLab and WCAG 2 contrast. Pure functions, no deps.
 * Inputs are #rgb / #rrggbb (alpha digits are ignored); outputs are #rrggbb.
 */

type Rgb = [number, number, number];

function parseHex(hex: string): Rgb {
  let h = hex.replace("#", "");
  if (h.length <= 4) h = [...h.slice(0, 3)].map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as Rgb;
}

const toHex = (rgb: Rgb) =>
  "#" + rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("");

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function toOklab(rgb: Rgb): Rgb {
  const [r, g, b] = rgb.map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, a, b]: Rgb): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(fromLinear) as Rgb;
}

/** `amount` (0–1) of `b` mixed into `a`, in OKLab (like CSS color-mix(in oklab, …)). */
export function mix(a: string, b: string, amount: number): string {
  const A = toOklab(parseHex(a));
  const B = toOklab(parseHex(b));
  return toHex(fromOklab(A.map((v, i) => v + (B[i] - v) * amount) as Rgb));
}

function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio between two colours (1–21). */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The colour darkened towards `base` — at least by `start`, and further until
 * white text on it reaches `target`:1. Very light colours end up much darker;
 * already dark ones only get the `start` step.
 */
export function deepenForWhiteText(hex: string, target: number, start = 0, base = "#000000"): string {
  for (let t = start; t <= 0.92; t += 0.02) {
    const c = mix(hex, base, t);
    if (contrast(c, "#ffffff") >= target) return c;
  }
  return mix(hex, base, 0.92);
}

/**
 * Lowest white opacity (from `min`) for text on `bg` to reach `target`:1.
 * Composited in sRGB, as browsers paint rgb(255 255 255 / a).
 */
export function whiteAlphaFor(bg: string, target: number, min: number): number {
  const base = parseHex(bg);
  for (let a = min; a < 1; a += 0.01) {
    const text = toHex(base.map((v) => v + (1 - v) * a) as Rgb);
    if (contrast(text, bg) >= target) return Math.round(a * 100) / 100;
  }
  return 1;
}
