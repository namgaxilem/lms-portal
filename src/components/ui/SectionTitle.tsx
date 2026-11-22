import type { ReactNode } from "react";
import { cn } from "./cn";

/** Heading row above a block of content, with an optional action (link/button). */
export function SectionTitle({
  title,
  action,
  className,
  as: Tag = "h2",
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
  as?: "h2" | "h3";
}) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)}>
      <Tag className="text-lg font-extrabold tracking-tight text-fg">{title}</Tag>
      {action && <div className="shrink-0 text-sm font-semibold text-primary-text">{action}</div>}
    </div>
  );
}
