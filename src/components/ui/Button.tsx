import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-fg hover:bg-primary-hover",
  secondary:
    "border border-line bg-surface text-fg hover:border-line-strong hover:bg-surface-2",
  ghost: "text-muted hover:bg-surface-2 hover:text-fg",
  danger: "bg-error text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
  icon: "h-9 w-9",
  "icon-sm": "h-8 w-8",
};

export function buttonClass(
  variant: Variant = "primary",
  size: Size = "md",
  className?: string
) {
  return cn(base, variants[variant], sizes[size], className);
}

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children?: ReactNode;
}

/** Button, or a Next.js Link styled as one when `href` is set. */
export function Button({
  variant,
  size,
  className,
  href,
  external,
  ...props
}: CommonProps &
  Omit<ComponentProps<"button">, "className"> & {
    href?: string;
    /** Open href in a new tab (for Moodle deep links). */
    external?: boolean;
  }) {
  const cls = buttonClass(variant, size, className);
  if (href) {
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={cls}
          aria-label={props["aria-label"]}
        >
          {props.children}
        </a>
      );
    }
    return (
      <Link href={href} className={cls} aria-label={props["aria-label"]}>
        {props.children}
      </Link>
    );
  }
  return <button type="button" className={cls} {...props} />;
}
