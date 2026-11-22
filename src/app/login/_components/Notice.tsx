import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/components/ui";

const tones = {
  info: "border-primary/20 bg-primary-soft text-primary-text",
  warning: "border-warning/30 bg-warning-soft text-warning-text",
  error: "border-error/25 bg-error-soft text-error-text",
};

/** Inline message box above the login form (session expired, maintenance, errors). */
export function Notice({
  tone,
  icon: Icon,
  title,
  role,
  id,
  children,
}: {
  tone: keyof typeof tones;
  icon: LucideIcon;
  title?: ReactNode;
  role?: "alert" | "status";
  id?: string;
  children?: ReactNode;
}) {
  return (
    <div
      id={id}
      role={role}
      className={cn("flex items-start gap-2.5 rounded-control border px-3.5 py-3 text-[13px] leading-relaxed", tones[tone])}
    >
      <Icon size={16} strokeWidth={2} aria-hidden className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}
