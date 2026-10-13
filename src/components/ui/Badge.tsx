import type { ComponentProps } from "react";
import { cn } from "./cn";

export type Tone =
  | "neutral"
  | "primary"
  | "accent"
  | "violet"
  | "success"
  | "warning"
  | "danger";

export const toneClass: Record<Tone, string> = {
  neutral: "border-line bg-surface-2 text-muted",
  primary: "border-transparent bg-primary-soft text-primary-text",
  accent: "border-transparent bg-accent-soft text-accent",
  violet: "border-transparent bg-violet-soft text-violet",
  success: "border-transparent bg-success-soft text-success",
  warning: "border-transparent bg-warning-soft text-[#b45309] dark:text-warning",
  danger: "border-transparent bg-error-soft text-error",
};

/** Small status pill. `dot` prepends a colored dot. */
export function Badge({
  tone = "neutral",
  dot,
  className,
  children,
  ...props
}: ComponentProps<"span"> & { tone?: Tone; dot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-md border px-2 text-xs font-medium",
        toneClass[tone],
        className
      )}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
