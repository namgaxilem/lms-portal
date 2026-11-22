import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";
import type { Tone } from "./Badge";

const soft: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  primary: "bg-primary-soft text-primary-text",
  accent: "bg-accent-soft text-accent",
  violet: "bg-violet-soft text-violet",
  success: "bg-success-soft text-success-text",
  warning: "bg-warning-soft text-warning-text",
  danger: "bg-error-soft text-error-text",
};

const solid: Record<Tone, string> = {
  neutral: "bg-linear-to-br from-slate-400 to-slate-600 shadow-slate-500/30",
  primary: "bg-brand-gradient shadow-primary/30",
  accent: "bg-linear-to-br from-sky-400 to-sky-600 shadow-sky-500/30",
  violet: "bg-linear-to-br from-violet-400 to-violet-600 shadow-violet-500/30",
  success: "bg-linear-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30",
  warning: "bg-linear-to-br from-amber-400 to-orange-500 shadow-amber-500/30",
  danger: "bg-linear-to-br from-rose-400 to-rose-600 shadow-rose-500/30",
};

const sizes = {
  sm: { box: "h-9 w-9 rounded-xl", icon: 17 },
  md: { box: "h-11 w-11 rounded-2xl", icon: 20 },
  lg: { box: "h-14 w-14 rounded-2xl", icon: 24 },
};

/**
 * Coloured square holding an icon — the main way colour enters the UI.
 * `solid` = gradient tile with a white icon (stats, hero accents).
 */
export function IconTile({
  icon: Icon,
  tone = "primary",
  size = "md",
  solid: isSolid,
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: keyof typeof sizes;
  solid?: boolean;
  className?: string;
}) {
  const s = sizes[size];
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center",
        s.box,
        isSolid ? cn("text-white shadow-md", solid[tone]) : soft[tone],
        className
      )}
    >
      <Icon size={s.icon} strokeWidth={isSolid ? 2 : 1.85} />
    </span>
  );
}
