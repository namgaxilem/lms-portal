/**
 * School branding.
 *
 * One build serves any school: the defaults below can be overridden per
 * deployment with environment variables (read on the server at request time,
 * see brand.server.ts), so no code change or rebuild is needed to rebrand.
 *
 *   BRAND_NAME            Full school name ("Trường Đại học …")
 *   BRAND_SHORT_NAME      Short code shown in titles ("UFM")
 *   BRAND_APP_NAME        Product name in the app shell ("UFM Learning")
 *   BRAND_DESCRIPTION     Meta description / login subtitle
 *   BRAND_TAGLINE         Short slogan on the landing and login pages (optional)
 *   BRAND_URL             Public URL of the portal (OpenGraph)
 *   BRAND_LOGO_MARK       Square logo: /path under public/ or https:// URL
 *   BRAND_FAVICON         Favicon path or URL
 *   BRAND_COLOR_PRIMARY   Main colour (hex). Buttons, links, active states.
 *   BRAND_COLOR_SECONDARY Second gradient stop (hex)
 *   BRAND_COLOR_ACCENT    Third gradient stop (hex) — gives the vivid hero gradient
 *   BRAND_COLOR_PRIMARY_DARK  Optional lighter primary for dark mode (hex)
 *   BRAND_COLOR_SUCCESS / BRAND_COLOR_WARNING / BRAND_COLOR_ERROR  Status colours (hex)
 *   BRAND_SUPPORT_EMAIL / BRAND_SUPPORT_PHONE / BRAND_SUPPORT_ADDRESS
 *                         Contact details on the landing and login pages (optional)
 *
 * The sidebar / phone top bar colours are derived from BRAND_COLOR_PRIMARY
 * (sidebarColors), so they follow whichever school is configured.
 */

import { deepenForWhiteText, mix, whiteAlphaFor } from "./color";

interface BrandColors {
  primary: string;
  /** Primary used on dark surfaces; derived from `primary` when not set. */
  primaryDark: string | null;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
}

export interface Brand {
  name: string;
  shortName: string;
  appName: string;
  description: string;
  /** Short slogan; empty string = none. */
  tagline: string;
  url: string;
  logoMark: string;
  favicon: string;
  colors: BrandColors;
  support: { email: string | null; phone: string | null; address: string | null };
}

const DEFAULT_BRAND: Brand = {
  name: "Trường Đại học Tài chính - Marketing",
  shortName: "UFM",
  appName: "UFM Learning",
  description: "Hệ thống E-Learning của Trường Đại học Tài chính - Marketing",
  tagline: "",
  url: "https://lms-ufm.edu.vn/",
  logoMark: "/images/logo-mark.png",
  favicon: "/favicon.ico",
  colors: {
    primary: "#1d4ed8",
    primaryDark: null,
    secondary: "#6d28d9",
    accent: "#db2777",
    success: "#059669",
    warning: "#d97706",
    error: "#dc2626",
  },
  support: { email: null, phone: null, address: null },
};

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
/** Root-relative public path or http(s) URL — never javascript:/data: etc. */
const ASSET = /^(?:\/(?!\/)[^\s"'<>]*|https?:\/\/[^\s"'<>]+)$/i;

type Env = Record<string, string | undefined>;

const text = (v: string | undefined, fallback: string) => (v && v.trim() ? v.trim() : fallback);
const color = (v: string | undefined, fallback: string) => (v && HEX.test(v.trim()) ? v.trim() : fallback);
const asset = (v: string | undefined, fallback: string) => (v && ASSET.test(v.trim()) ? v.trim() : fallback);

/**
 * Builds the brand from defaults + overrides. Colours and asset URLs are
 * validated because they end up in a <style> tag and <img src> attributes.
 */
export function resolveBrand(env: Env, base: Brand = DEFAULT_BRAND): Brand {
  const c = base.colors;
  return {
    name: text(env.BRAND_NAME, base.name),
    shortName: text(env.BRAND_SHORT_NAME, base.shortName),
    appName: text(env.BRAND_APP_NAME, base.appName),
    description: text(env.BRAND_DESCRIPTION, base.description),
    tagline: env.BRAND_TAGLINE?.trim() ?? base.tagline,
    url: asset(env.BRAND_URL, base.url),
    logoMark: asset(env.BRAND_LOGO_MARK, base.logoMark),
    favicon: asset(env.BRAND_FAVICON, base.favicon),
    colors: {
      primary: color(env.BRAND_COLOR_PRIMARY, c.primary),
      primaryDark: env.BRAND_COLOR_PRIMARY_DARK && HEX.test(env.BRAND_COLOR_PRIMARY_DARK.trim())
        ? env.BRAND_COLOR_PRIMARY_DARK.trim()
        : c.primaryDark,
      secondary: color(env.BRAND_COLOR_SECONDARY, c.secondary),
      accent: color(env.BRAND_COLOR_ACCENT, c.accent),
      success: color(env.BRAND_COLOR_SUCCESS, c.success),
      warning: color(env.BRAND_COLOR_WARNING, c.warning),
      error: color(env.BRAND_COLOR_ERROR, c.error),
    },
    support: {
      email: env.BRAND_SUPPORT_EMAIL?.trim() || base.support.email,
      phone: env.BRAND_SUPPORT_PHONE?.trim() || base.support.phone,
      address: env.BRAND_SUPPORT_ADDRESS?.trim() || base.support.address,
    },
  };
}

/** Mixes a hex colour with white (amount 0–1) in sRGB; returns #rrggbb. */
function tint(hex: string, amount: number): string {
  let h = hex.slice(1);
  if (h.length <= 4) h = h.split("").map((ch) => ch + ch).join("");
  const n = parseInt(h.slice(0, 6), 16);
  const lift = (v: number) => Math.round(v + (255 - v) * amount);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(lift);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Primary for dark surfaces: explicit override, else the primary lifted towards white. */
export function primaryOnDark(brand: Brand): string {
  return brand.colors.primaryDark ?? tint(brand.colors.primary, 0.35);
}

/**
 * School-coloured navigation (sidebar, phone top bar): the primary colour,
 * deepened just enough that white text is comfortably readable (≥ 8:1 light,
 * ≥ 9:1 dark mode) whatever the school's colour — pale brands get a much darker
 * shade, dark ones barely change. Secondary text uses the faintest white that
 * still meets WCAG AA on both backgrounds.
 */
export function sidebarColors(brand: Brand) {
  const p = brand.colors.primary;
  const light = deepenForWhiteText(p, 8, 0.16);
  const dark = mix(deepenForWhiteText(p, 9, 0.2), "#05070c", 0.45);
  const alpha = (min: number) => Math.max(whiteAlphaFor(light, 4.6, min), whiteAlphaFor(dark, 4.6, min));
  return {
    light,
    dark,
    /** Text of the selected item, which sits on white. */
    activeText: deepenForWhiteText(p, 7, 0.3),
    labelAlpha: alpha(0.6),
    mutedAlpha: alpha(0.68),
  };
}

/** CSS custom properties for the brand (consumed by globals.css tokens). */
export function brandCssVars(brand: Brand): string {
  const c = brand.colors;
  const nav = sidebarColors(brand);
  return [
    `--brand-primary:${c.primary}`,
    `--brand-primary-dark:${primaryOnDark(brand)}`,
    `--brand-secondary:${c.secondary}`,
    `--brand-accent:${c.accent}`,
    `--brand-success:${c.success}`,
    `--brand-warning:${c.warning}`,
    `--brand-error:${c.error}`,
    `--brand-sidebar:${nav.light}`,
    `--brand-sidebar-dark:${nav.dark}`,
    `--brand-sidebar-active:${nav.activeText}`,
    `--brand-sidebar-label:rgb(255 255 255 / ${nav.labelAlpha})`,
    `--brand-sidebar-muted:rgb(255 255 255 / ${nav.mutedAlpha})`,
  ].join(";");
}
