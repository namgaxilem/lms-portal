import { brandCssVars, type Brand } from "./brand";

/**
 * Emits the brand colours as CSS variables so Tailwind utilities (bg-primary,
 * bg-brand-gradient, …) and antd resolve to the same values. Server component,
 * so the variables exist on first paint (no flash). Values are validated in
 * resolveBrand() before they get here.
 */
export function BrandStyle({ brand }: { brand: Brand }) {
  return <style id="brand-vars" dangerouslySetInnerHTML={{ __html: `:root{${brandCssVars(brand)}}` }} />;
}
