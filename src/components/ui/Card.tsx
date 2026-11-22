import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

/** Rounded surface with a soft shadow — the base container for content blocks. */
export function Card({
  className,
  interactive,
  ...props
}: ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-card border border-line/60 bg-surface shadow-card dark:border-line",
        interactive && "transition duration-200 hover:-translate-y-0.5 hover:shadow-lift",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 px-5 pb-1 pt-5", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-bold text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-subtle">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
