import type { CSSProperties } from "react";
import { cn } from "./cn";

const fills = {
  primary: "bg-primary",
  success: "bg-success",
  gradient: "bg-brand-gradient",
  course: "bg-course",
  white: "bg-white",
};

/**
 * Rounded progress bar, value 0–100; grows from the left on mount.
 * `tone="course"` uses the `--course` colour of an ancestor (courseStyle()).
 */
export function Progress({
  value,
  className,
  tone = "primary",
  size = "md",
  trackClassName,
  style,
  label,
}: {
  value: number;
  className?: string;
  tone?: keyof typeof fills;
  size?: "sm" | "md" | "lg";
  trackClassName?: string;
  style?: CSSProperties;
  /** Accessible name, e.g. "Course progress". */
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      style={style}
      className={cn(
        "w-full overflow-hidden rounded-full",
        { sm: "h-1.5", md: "h-2", lg: "h-2.5" }[size],
        trackClassName ?? "bg-surface-3",
        className
      )}
    >
      <div
        className={cn("h-full origin-left animate-[progress-grow_0.9s_cubic-bezier(.2,.8,.2,1)] rounded-full", fills[tone])}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}
