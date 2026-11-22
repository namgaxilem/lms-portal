import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "gradient" | "secondary" | "ghost" | "danger" | "light";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-fg shadow-sm hover:bg-primary-hover focus-visible:outline-ring",
  /** Brand gradient — for the one main call to action on a screen. */
  gradient:
    "bg-brand-gradient text-white shadow-md shadow-primary/25 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 focus-visible:outline-ring",
  secondary:
    "bg-surface text-fg ring-1 ring-line hover:bg-surface-2 hover:ring-line-strong focus-visible:outline-ring",
  ghost: "text-muted hover:bg-surface-2 hover:text-fg focus-visible:outline-ring",
  danger: "bg-error text-white hover:opacity-90 focus-visible:outline-ring",
  /** White button for use on gradient / coloured backgrounds, with a white focus outline. */
  light: "bg-white text-slate-900 shadow-md shadow-black/10 hover:-translate-y-0.5 focus-visible:outline-white",
};

const sizes: Record<Size, string> = {
  sm: "h-9 rounded-xl px-3.5 text-[13px]",
  md: "h-10 rounded-xl px-4 text-sm",
  lg: "h-12 rounded-2xl px-6 text-[15px]",
  icon: "h-10 w-10 rounded-xl",
  "icon-sm": "h-9 w-9 rounded-xl",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children?: ReactNode;
}

type AsButton = CommonProps & Omit<ComponentProps<"button">, "className"> & { href?: undefined; external?: undefined };
type AsLink = CommonProps &
  Omit<ComponentProps<"a">, "className" | "href"> & {
    href: string;
    /** Open href in a new tab (for Moodle deep links). */
    external?: boolean;
    /** Renders a non-interactive look-alike instead of a link. */
    disabled?: boolean;
  };

/** Button, or a Next.js Link styled as one when `href` is set. */
export function Button(props: AsButton | AsLink) {
  if (props.href === undefined) {
    const { variant, size, className, ...rest } = props;
    return <button type="button" className={buttonClass(variant, size, className)} {...rest} />;
  }
  const { variant, size, className, href, external, disabled, children, ...rest } = props;
  const cls = buttonClass(variant, size, className);
  if (disabled) {
    return (
      <span aria-disabled="true" className={cn(cls, "pointer-events-none opacity-50")}>
        {children}
      </span>
    );
  }
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}
