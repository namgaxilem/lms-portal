import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";
import type { Tone } from "./Badge";
import { IconTile } from "./IconTile";

/** KPI tile: label, big value, optional colored icon tile and hint. */
export function StatCard({
  label,
  value,
  icon,
  tone = "primary",
  hint,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border border-line bg-surface p-4",
        className
      )}
    >
      {icon && <IconTile icon={icon} tone={tone} />}
      <div className="min-w-0">
        <div className="truncate text-[13px] text-subtle">{label}</div>
        <div className="mt-0.5 text-2xl font-semibold leading-tight tracking-tight tabular-nums text-fg">
          {value}
        </div>
        {hint && <div className="mt-0.5 text-xs text-subtle">{hint}</div>}
      </div>
    </div>
  );
}
