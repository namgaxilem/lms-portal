"use client";
import { FallbackImg } from "@/components/ui/FallbackImg";
import { initials } from "@/lib/format";
import { cn } from "@/components/ui/cn";

// Soft tints keyed by id — distinguishable, never loud.
const TINTS = [
  "bg-primary-soft text-primary-text",
  "bg-success-soft text-success",
  "bg-warning-soft text-[#b45309] dark:text-warning",
  "bg-surface-3 text-muted",
];

// Moodle serves a generic silhouette (…/theme/image.php/…/u/f1) for users
// without a photo; fall back to initials instead of showing it.
const DEFAULT_PIC = /\/theme\/image\.php\/.*\/u\/f\d/;

/** Round avatar: photo when available, else initials tinted by id. */
export function UserAvatar({
  name,
  id,
  size = 36,
  src,
  className,
}: {
  name: string;
  id: number;
  size?: number;
  src?: string | null;
  className?: string;
}) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  const fallback = (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        TINTS[Math.abs(id) % TINTS.length],
        className
      )}
      style={style}
    >
      {initials(name)}
    </div>
  );
  return (
    <FallbackImg
      src={src && !DEFAULT_PIC.test(src) ? src : null}
      style={style}
      className={cn("shrink-0 rounded-full object-cover", className)}
      fallback={fallback}
    />
  );
}
