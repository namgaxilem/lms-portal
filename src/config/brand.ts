/**
 * ─────────────────────────────────────────────────────────────────────────
 *  SINGLE SOURCE OF BRANDING — edit this file to rebrand for another school.
 * ─────────────────────────────────────────────────────────────────────────
 *  Edit the config object below to customize:
 *  - School name, description, and contact info
 *  - Colors (primary, secondary, success, warning, error)
 *  - Logo and favicon
 *  - OpenGraph metadata (social sharing)
 *  - SEO and metadata
 */
export const brand = {
  // School Identity
  name: "Trường Đại học Tài chính- Marketing",
  shortName: "UFM",
  description: "Hệ thống E-Learning của Trường Đại học Tài chính- Marketing",
  tagline: "UFM LMS",
  // Compact label for the app sidebar / header
  appName: "UFM Learning",

  // Contact & Location
  contact: {
    email: "support@lms-ufm.edu.vn",
    phone: "0981 899 948",
    address: "Phòng D003 số 778 Nguyễn Kiệm, phường Đức Nhuận, TP.Hồ Chí Minh",
    website: "https://lms-ufm.edu.vn",
  },

  // Colors — `primary` is the single accent; neutrals live in globals.css.
  // `primaryDark` is the lifted accent used in dark mode for contrast.
  colors: {
    primary: "#14468c",
    primaryDark: "#3b7ae0",
    secondary: "#2d7dec",
    success: "#2d8659",
    warning: "#f59e0b",
    error: "#c5192d",
  },

  // Logo & Favicon
  // logo: path under /public (e.g., "/logo.png"), or null to show the name text
  // favicon: path under /public (e.g., "/favicon.ico")
  logo: null as string | null,
  // Square, tightly-cropped mark used in the app shell, login and landing.
  logoMark: "/images/logo-mark.png",
  favicon: "/favicon.ico",

  // OpenGraph Metadata (for social sharing, SEO)
  openGraph: {
    title: "Hệ thống E-Learning - Trường Đại học Tài chính- Marketing",
    description: "Chào mừng bạn đến với hệ thống E-Learning của Trường Đại học Tài chính- Marketing",
    image: null as string | null, // e.g., "/og-image.png" (1200x630px recommended)
    url: "https://lms-ufm.edu.vn/",
    type: "website",
  },

  // SEO & Metadata
  seo: {
    keywords: "school, learning, courses, grades, academic, lms, e-learning",
    author: "Sen Viet",
    themeColor: "#14468c",
  },

  // Visual tuning shared by antd + the app shell
  borderRadius: 8,
} as const;

export type Brand = typeof brand;
