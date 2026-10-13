import type { ReactNode } from "react";
import { cn } from "./cn";

/** Standard page title block: title, optional description, right-aligned actions. */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Small line above the title (breadcrumb / back link). */
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-[13px] text-subtle">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
