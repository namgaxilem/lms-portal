import type { ComponentProps } from "react";
import { cn } from "./cn";

export type Tone = "neutral" | "primary" | "accent" | "violet" | "success" | "warning" | "danger";

/** Soft tinted pill colours (text meets AA on the tint in light and dark). */
export const toneClass: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  primary: "bg-primary-soft text-primary-text",
  accent: "bg-accent-soft text-accent",
  violet: "bg-violet-soft text-violet",
  success: "bg-success-soft text-success-text",
  warning: "bg-warning-soft text-warning-text",
  danger: "bg-error-soft text-error-text",
};

/** Solid fills with white (or brand foreground) text, all at least 4.5:1. */
export const solidClass: Record<Tone, string> = {
  neutral: "bg-slate-600 text-white",
  primary: "bg-primary text-primary-fg",
  accent: "bg-sky-700 text-white",
  violet: "bg-violet-600 text-white",
  success: "bg-emerald-700 text-white",
  warning: "bg-amber-700 text-white",
  danger: "bg-rose-600 text-white",
};

/* Sizes are a prop: `cn` does not merge Tailwind classes, so a height passed in
   `className` would not reliably override the default one. */
const sizes = {
  sm: "h-5 px-2 text-[11px]",
  md: "h-6 px-2.5 text-xs",
};

/** Small status pill. `solid` for urgent states; `dot` prepends a coloured dot. */
export function Badge({
  tone = "neutral",
  solid,
  dot,
  size = "md",
  className,
  children,
  ...props
}: ComponentProps<"span"> & { tone?: Tone; solid?: boolean; dot?: boolean; size?: keyof typeof sizes }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold",
        sizes[size],
        solid ? solidClass[tone] : toneClass[tone],
        className
      )}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
