import { brand } from "./brand";

/**
 * Emits the brand colors as CSS variables so Tailwind utilities (bg-primary,
 * text-primary, …) resolve to the same values antd uses. Server component, so
 * the variables are present on first paint (no flash). See globals.css for the
 * `@theme inline` mapping that turns these into Tailwind color utilities.
 */
export function BrandStyle() {
  const css = `:root{--brand-primary:${brand.colors.primary};--brand-primary-dark:${brand.colors.primaryDark};--brand-secondary:${brand.colors.secondary};--brand-success:${brand.colors.success};--brand-warning:${brand.colors.warning};--brand-error:${brand.colors.error};}`;
  return <style id="brand-vars" dangerouslySetInnerHTML={{ __html: css }} />;
}
