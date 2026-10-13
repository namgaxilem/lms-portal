import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

export const inputClass =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg outline-none transition-[border-color,box-shadow] placeholder:text-subtle hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-ring/30 disabled:opacity-60";

/** Text field with optional leading icon and trailing slot. */
export function Input({
  icon: Icon,
  trailing,
  className,
  wrapperClassName,
  ...props
}: ComponentProps<"input"> & {
  icon?: LucideIcon;
  trailing?: ReactNode;
  wrapperClassName?: string;
}) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      {Icon && (
        <Icon
          size={16}
          strokeWidth={1.75}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
        />
      )}
      <input
        className={cn(inputClass, Icon && "pl-9", trailing && "pr-11", className)}
        {...props}
      />
      {trailing && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2">{trailing}</div>
      )}
    </div>
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("mb-1.5 block text-[13px] font-medium text-fg", className)}
      {...props}
    />
  );
}
