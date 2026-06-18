# Centralized Brand Configuration Guide

All school branding, colors, metadata, and general configuration is now centralized in a single file for easy management.

## Configuration File Location

**`src/config/brand.ts`** — This is the single source of truth for all branding.

## What You Can Configure

### 1. **School Identity**
```typescript
name: "Sen Viet School",           // Full school name (shown in header, browser tab)
shortName: "SV",                   // Short name (shown in page title template)
description: "...",                // School description (used in metadata)
tagline: "Academic Portal",        // Tagline (shown under school name in sidebar)
```

### 2. **Contact & Location Information**
```typescript
contact: {
  email: "info@senviet.edu.vn",
  phone: "+84 (0) 123 456 789",
  address: "123 School Street, City, Country",
  website: "https://www.senviet.edu.vn",
}
```

### 3. **Colors (Material 3 Design System)**
```typescript
colors: {
  primary: "#1f108e",      // Main brand color (buttons, links, highlights)
  secondary: "#006a61",    // Secondary color (accents)
  success: "#006a61",      // Success state (green)
  warning: "#f59e0b",      // Warning state (amber)
  error: "#ba1a1a",        // Error state (red)
}
```

**How colors are used:**
- Applied to Ant Design components automatically
- Available as Tailwind utilities: `bg-primary`, `text-secondary`, `border-success`, etc.
- CSS variables: `--brand-primary`, `--brand-secondary`, etc.

### 4. **Logo & Favicon**
```typescript
logo: null,                    // null = show school name as text
                               // "/logo.png" = path to logo file in /public
favicon: "/favicon.ico",       // Path to favicon in /public
```

**To use a logo:**
1. Place your logo file in `public/` directory (e.g., `public/logo.png`)
2. Update: `logo: "/logo.png"`

### 5. **OpenGraph Metadata (Social Sharing & SEO)**
```typescript
openGraph: {
  title: "Sen Viet School - Academic Portal",
  description: "Web portal for Sen Viet School - Access courses, grades, and academic resources",
  image: null,               // null = no image
                             // "/og-image.png" = path to 1200x630px image in /public
  url: "https://portal.senviet.edu.vn",
  type: "website",
}
```

**How it's used:**
- When someone shares the portal link on social media (Facebook, Twitter, etc.)
- Search engine preview snippets
- Browser tab previews

### 6. **SEO & Metadata**
```typescript
seo: {
  keywords: "school, learning, courses, grades, academic",
  author: "Sen Viet School",
  themeColor: "#1f108e",     // Browser address bar color (Chrome mobile)
}
```

### 7. **Visual Tuning**
```typescript
borderRadius: 12,            // Border radius for components (in pixels)
```

## How to Update Configuration

1. Open `src/config/brand.ts`
2. Edit the values you want to change
3. Save the file
4. Changes apply immediately (Next.js hot reload)

### Example: Change School Name and Colors

```typescript
export const brand = {
  name: "My New School",
  shortName: "MNS",
  colors: {
    primary: "#FF6B6B",      // Red
    secondary: "#4ECDC4",    // Teal
    success: "#95E1D3",
    warning: "#FFE66D",
    error: "#FF6B6B",
  },
  // ... rest of config
}
```

## Where Configuration is Used

### **Metadata & SEO**
- Browser tab title
- Page descriptions
- OpenGraph tags (social sharing)
- Twitter card
- Theme color

### **UI Components**
- Sidebar header (school name + tagline)
- Button colors
- Link colors
- Form focus states
- Badge colors

### **Styling**
- Ant Design theme (primary/secondary colors)
- Tailwind utilities (`bg-primary`, `text-secondary`, etc.)
- CSS variables for custom styling

## Files That Reference Brand Config

- `src/app/layout.tsx` — Root layout (metadata)
- `src/app/(app)/layout.tsx` — App layout
- `src/components/layout/AppLayout.tsx` — Sidebar and header
- `src/config/BrandStyle.tsx` — CSS variable injection
- Any component using `import { brand } from "@/config/brand"`

## Adding New Configuration Fields

If you need to add more fields (e.g., social media links, support contact):

1. Add to `brand` object in `src/config/brand.ts`
2. Import and use in components: `import { brand } from "@/config/brand"`
3. Access via `brand.yourNewField`

Example:
```typescript
export const brand = {
  // ... existing config
  social: {
    facebook: "https://facebook.com/senviet",
    twitter: "https://twitter.com/senviet",
    instagram: "https://instagram.com/senviet",
  },
}
```

Then use in a component:
```typescript
import { brand } from "@/config/brand";

export function SocialLinks() {
  return (
    <a href={brand.social.facebook}>Facebook</a>
  );
}
```

## Best Practices

✅ **Do:**
- Keep all branding in `src/config/brand.ts`
- Use `brand.colors.*` instead of hardcoding hex values
- Use `brand.name` and `brand.shortName` for consistency
- Update contact info when school details change

❌ **Don't:**
- Hardcode school name in components
- Hardcode colors in components
- Duplicate configuration in multiple files
- Add environment variables for branding (use this config file instead)

## Quick Reference

| What to Change | Where to Edit | Field |
|---|---|---|
| School name | `brand.ts` | `name` |
| Logo | `brand.ts` + `/public` | `logo` |
| Primary color | `brand.ts` | `colors.primary` |
| Tagline | `brand.ts` | `tagline` |
| Contact email | `brand.ts` | `contact.email` |
| Social sharing image | `brand.ts` + `/public` | `openGraph.image` |
| Browser tab color | `brand.ts` | `seo.themeColor` |

## Troubleshooting

**Changes not appearing?**
- Clear browser cache (Ctrl+Shift+Delete)
- Restart dev server (`npm run dev`)
- Check that you saved the file

**Colors not applying?**
- Ensure component imports `brand` from `@/config/brand`
- Check that Tailwind/Ant Design is properly configured
- Verify CSS variables are injected (check `<style id="brand-vars">` in HTML)

**Logo not showing?**
- Verify file exists in `/public` directory
- Check file path is correct (e.g., `/logo.png` not `logo.png`)
- Ensure image format is supported (PNG, SVG, JPG)
