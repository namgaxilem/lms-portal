import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

/** Centered empty/zero state with icon, title, hint and optional action. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  hint,
  action,
  className,
  compact,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 text-center",
        compact ? "gap-2.5 py-8" : "gap-3 py-16",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-primary-soft text-primary-text",
          compact ? "h-11 w-11" : "h-14 w-14"
        )}
      >
        <Icon size={compact ? 20 : 24} strokeWidth={1.85} />
      </div>
      <div>
        <p className="text-sm font-semibold text-fg">{title}</p>
        {hint && <p className="mx-auto mt-1 max-w-sm text-[13px] text-subtle">{hint}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
