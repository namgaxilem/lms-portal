# Configuration & branding guide

The portal is multi-tenant by configuration: **one build can be deployed for any school**.
Everything school-specific is read from environment variables **at runtime** (on the server, per
request). Changing a value only needs a restart, not a rebuild.

## 1. Moodle connection

| Variable | Required | Purpose |
|---|---|---|
| `MOODLE_URL` | yes | Moodle base URL as the portal server reaches it (no trailing slash). |
| `MOODLE_PUBLIC_URL` | no | Moodle's public `wwwroot`, when it differs from `MOODLE_URL` (for example an internal Docker hostname). Used for "Open in Moodle" links and to recognise Moodle file URLs. Defaults to `MOODLE_URL`. |
| `MOODLE_SERVICE` | no | External service short name. Default: `moodle_mobile_app`. |
| `MOODLE_INSECURE_TLS` | no | `1` trusts a self-signed certificate. Dev only. |
| `MOODLE_GRADING_TOKEN` | no | Token of a dedicated read-only service used for rubric and marking-guide grading (see `.env.example`). Without it, grading falls back to simple points. |
| `MOODLE_MAX_UPLOAD_MB` | no | Per-file upload limit for assignment submissions (default 50). |

There are no `NEXT_PUBLIC_*` variables. The browser gets the Moodle public URL from a small inline
script that the root layout renders (`src/lib/public-config.ts`).

## 2. School branding (`BRAND_*`)

All branding variables are optional. Unset values fall back to `DEFAULT_BRAND` in
[`src/config/brand.ts`](src/config/brand.ts), which is the single place to change the defaults.

| Variable | Example | Used for |
|---|---|---|
| `BRAND_NAME` | `Trường Đại học ABC` | Full school name: page titles, login, landing |
| `BRAND_SHORT_NAME` | `ABC` | Title suffix (`Page \| ABC`), sidebar |
| `BRAND_APP_NAME` | `ABC Learning` | Product name in the app shell |
| `BRAND_DESCRIPTION` | `Hệ thống học trực tuyến…` | Meta description, landing and login subtitle |
| `BRAND_TAGLINE` | `Học mọi lúc, mọi nơi` | Short slogan on the landing and login pages (hidden when empty) |
| `BRAND_URL` | `https://lms.abc.edu.vn` | OpenGraph URL |
| `BRAND_LOGO_MARK` | `/images/logo-mark.png` or `https://…/logo.svg` | Square logo (sidebar, login, landing) |
| `BRAND_FAVICON` | `/favicon.ico` | Browser tab icon |
| `BRAND_COLOR_PRIMARY` | `#1d4ed8` | Buttons, links, active states, first gradient stop |
| `BRAND_COLOR_SECONDARY` | `#6d28d9` | Second gradient stop |
| `BRAND_COLOR_ACCENT` | `#db2777` | Third gradient stop (the colourful hero gradient) |
| `BRAND_COLOR_PRIMARY_DARK` | `#7aa2ff` | Optional primary for dark mode (derived automatically when unset) |
| `BRAND_COLOR_SUCCESS` / `_WARNING` / `_ERROR` | `#059669` | Status colours |
| `BRAND_SUPPORT_EMAIL` / `_PHONE` / `_ADDRESS` | | Contact block on the landing and login pages (each hidden when empty) |

Validation: colours must be hex (`#rgb`, `#rrggbb`, with or without alpha). Logo and favicon must
be a root-relative path under `public/` or an `http(s)://` URL. Invalid values are ignored and the
default is used. They are never injected into CSS or HTML unchecked.

> **Quote hex colours in `.env` files**: `BRAND_COLOR_PRIMARY="#0e5b63"`. Unquoted, the `#` starts a
> comment, the value becomes empty and the default colour is used silently.

**School-coloured navigation.** The sidebar (desktop), the top bar (phones and tablets) and the
mobile browser bar use a colour derived from `BRAND_COLOR_PRIMARY` (`sidebarColors()` in
`src/config/brand.ts`). The primary is deepened just enough for white text to reach at least
8:1 (9:1 in dark mode), so any school colour works: dark brands barely change, pale ones
(yellow, pastel) get a much darker shade. There is no separate variable to set.

Example: Học viện Tài chính (HVTC), using the colours of its Moodle theme:

```env
BRAND_NAME=Học viện Tài chính
BRAND_SHORT_NAME=HVTC
BRAND_APP_NAME=HVTC E-Learning
BRAND_COLOR_PRIMARY="#0e5b63"
BRAND_COLOR_SECONDARY="#007583"
BRAND_COLOR_ACCENT="#c9a227"
```

Remove (or comment out) the `BRAND_*` lines to go back to the defaults (UFM), or set another
school's values. Restart the portal after changing them (`next dev` reloads `.env.local` itself).

### How branding reaches the UI

```
env BRAND_*  ──►  getBrand()            (src/config/brand.server.ts, server only)
                    ├─► <BrandStyle>     CSS variables --brand-* on :root
                    │                    → Tailwind tokens primary / brand-secondary / brand-accent,
                    │                      utilities bg-brand-gradient, text-brand-gradient
                    ├─► <BrandProvider>  useBrand() in client components (names, logo, support)
                    └─► generateMetadata title, description, OpenGraph, favicon
```

Rules for contributors:

- Never hard-code a school name, logo path or brand hex colour in components. Use `useBrand()`,
  `getBrand()` or the brand tokens.
- Per-course colours (covers, rings) come from `courseStyle(course.id)` in `src/lib/course-color.ts`.
  They are deliberately independent of the brand so courses stay distinguishable.
- Dark mode is supported everywhere. The brand primary is lifted automatically for dark
  surfaces unless `BRAND_COLOR_PRIMARY_DARK` is set.

## 3. Moodle-side setup checklist for a new school

1. Enable web services and the **Moodle mobile web service** (`moodle_mobile_app`), with the
   REST protocol.
2. Make sure users can get a token for that service. They need the `moodle/webservice:createtoken`
   and `webservice/rest:use` capabilities. Check with a student account: if they cannot sign in to
   the portal while Moodle itself works, this is the usual cause.
3. Optional, for richer grading: create the dedicated grading service and token described in
   `.env.example` and set `MOODLE_GRADING_TOKEN`.
4. Set the `BRAND_*` variables and `MOODLE_URL`, then restart the portal.

## 4. Supported Moodle versions

The portal works on **Moodle 4.1 and newer**, including 4.5 LTS and 5.x. Features that need a newer
Moodle are switched on automatically when the site reports the matching web-service function
(`useSiteFunctions` in `src/lib/moodle/hooks.ts`). See
[`docs/MOODLE-UPGRADE.md`](docs/MOODLE-UPGRADE.md) for the upgrade path and proposals.
