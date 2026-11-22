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
  /** Small line above the title (breadcrumb / back link / date). */
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-[13px] font-semibold text-primary-text">{eyebrow}</div>}
        <h1 className="text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">{title}</h1>
        {description && <div className="mt-1.5 text-[15px] text-muted">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
