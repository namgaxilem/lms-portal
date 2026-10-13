import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";
import type { Tone } from "./Badge";

const tiles: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  primary: "bg-primary-soft text-primary-text",
  accent: "bg-accent-soft text-accent",
  violet: "bg-violet-soft text-violet",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-[#b45309] dark:text-warning",
  danger: "bg-error-soft text-error",
};

const sizes = {
  sm: { box: "h-8 w-8 rounded-lg", icon: 16 },
  md: { box: "h-10 w-10 rounded-xl", icon: 18 },
  lg: { box: "h-12 w-12 rounded-xl", icon: 22 },
};

/** Soft-colored square holding an icon — the main way color enters the UI. */
export function IconTile({
  icon: Icon,
  tone = "primary",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const s = sizes[size];
  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center", s.box, tiles[tone], className)}
    >
      <Icon size={s.icon} strokeWidth={1.75} />
    </span>
  );
}
