import type { CSSProperties, ReactNode } from "react";
import { cn } from "./cn";

const bars = {
  primary: "stroke-primary",
  success: "stroke-success",
  course: "stroke-course",
  white: "stroke-white",
  violet: "stroke-violet-500",
};

const tracks = {
  primary: "stroke-primary-soft",
  success: "stroke-success-soft",
  course: "stroke-surface-3",
  white: "stroke-white/25",
  violet: "stroke-violet-100 dark:stroke-violet-500/20",
};

/**
 * Circular progress (0–100) that draws itself on mount. Children render in the
 * centre (e.g. the percentage). `tone="course"` follows the ancestor's --course.
 */
export function ProgressRing({
  value,
  size = 56,
  stroke = 6,
  tone = "primary",
  children,
  className,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: keyof typeof bars;
  children?: ReactNode;
  className?: string;
  /** Accessible name; the ring is announced as a progressbar. */
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const style = { width: size, height: size, ["--ring-len" as string]: `${len}` } as CSSProperties;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={style}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={tracks[tone]} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - v / 100)}
          className={cn("animate-[ring-fill_1.1s_cubic-bezier(.2,.8,.2,1)]", bars[tone])}
        />
      </svg>
      {children !== undefined && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}
