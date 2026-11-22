import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";
import type { Tone } from "./Badge";
import { IconTile } from "./IconTile";

const blob: Record<Tone, string> = {
  neutral: "bg-slate-200/60 dark:bg-slate-500/10",
  primary: "bg-primary-soft",
  accent: "bg-sky-100 dark:bg-sky-500/10",
  violet: "bg-violet-100 dark:bg-violet-500/10",
  success: "bg-emerald-100 dark:bg-emerald-500/10",
  warning: "bg-amber-100 dark:bg-amber-500/10",
  danger: "bg-rose-100 dark:bg-rose-500/10",
};

const hintText: Record<Tone, string> = {
  neutral: "text-subtle",
  primary: "text-primary-text",
  accent: "text-accent",
  violet: "text-violet",
  success: "text-success-text",
  warning: "text-warning-text",
  danger: "text-error-text",
};

/** KPI tile: gradient icon, label, big value and a tinted hint. Optional link. */
export function StatCard({
  label,
  value,
  icon,
  tone = "primary",
  hint,
  href,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  hint?: ReactNode;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <span aria-hidden className={cn("absolute -right-6 -top-6 h-24 w-24 rounded-full transition-transform duration-300 group-hover:scale-110", blob[tone])} />
      {icon && <IconTile icon={icon} tone={tone} solid className="relative" />}
      <div className="relative mt-4 min-w-0">
        <div className="truncate text-[13px] font-medium text-subtle">{label}</div>
        <div className="mt-0.5 text-[28px] font-extrabold leading-tight tracking-tight tabular-nums text-fg">{value}</div>
        {hint && <div className={cn("mt-1 truncate text-xs font-medium", hintText[tone])}>{hint}</div>}
      </div>
    </>
  );
  const cls = cn(
    "group relative block overflow-hidden rounded-card border border-line/60 bg-surface p-5 shadow-card dark:border-line",
    href && "transition duration-200 hover:-translate-y-0.5 hover:shadow-lift",
    className
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
