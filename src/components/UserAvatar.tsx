"use client";
import { FallbackImg } from "@/components/ui/FallbackImg";
import { cn } from "@/components/ui/cn";
import { courseStyle } from "@/lib/course-color";
import { initials } from "@/lib/format";

// Moodle serves a generic silhouette for users without a photo: …/theme/image.php/…/u/f1
// (slash arguments) or …/theme/image.php?…image=u%2Ff1. Show initials instead.
const DEFAULT_PIC = /\/theme\/image\.php(?:\/.*\/u\/f\d|\?.*image=u(?:%2F|\/)f\d)/i;

/**
 * Round avatar: the Moodle photo when there is one, else white initials on a
 * vivid gradient. The colour comes from the course palette keyed by `id`, so a
 * person keeps the same colour everywhere.
 */
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
  const box = { width: size, height: size };
  const fallback = (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full bg-course-gradient font-bold text-white",
        className
      )}
      style={courseStyle(id, { ...box, fontSize: Math.round(size * 0.38) })}
    >
      {initials(name)}
    </div>
  );
  return (
    <FallbackImg
      src={src && !DEFAULT_PIC.test(src) ? src : null}
      style={box}
      className={cn("shrink-0 rounded-full bg-surface-2 object-cover", className)}
      fallback={fallback}
    />
  );
}
