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
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 py-8" : "gap-3 py-16",
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface-2 text-subtle">
        <Icon size={18} strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-sm font-medium text-fg">{title}</p>
        {hint && <p className="mt-1 text-[13px] text-subtle">{hint}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
