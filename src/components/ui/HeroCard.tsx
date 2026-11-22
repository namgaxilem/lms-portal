import type { ComponentProps } from "react";
import { cn } from "./cn";

/**
 * Big gradient banner with soft decorative circles and white text. Uses the
 * school's brand gradient, or the course colour when `course` is set (requires
 * an ancestor/own `--course`, see courseStyle()). `compact` = tighter padding
 * (a prop, because `cn` does not merge a padding passed in `className`).
 */
export function HeroCard({
  className,
  course,
  compact,
  children,
  ...props
}: ComponentProps<"section"> & { course?: boolean; compact?: boolean }) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-hero text-white shadow-xl",
        compact ? "p-5 sm:p-6" : "p-6 sm:p-8",
        course ? "bg-course-gradient shadow-course" : "bg-brand-gradient shadow-primary/20",
        className
      )}
      {...props}
    >
      {/* Scrim on the text side keeps white text legible on light course colours. */}
      {course && <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-r from-black/25 via-black/10 to-transparent" />}
      <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-white/10" />
      <span aria-hidden className="pointer-events-none absolute -bottom-28 right-1/3 -z-10 h-72 w-72 rounded-full border-[40px] border-white/[0.06]" />
      <span aria-hidden className="pointer-events-none absolute left-1/2 top-6 -z-10 h-2 w-2 rounded-full bg-white/50" />
      {children}
    </section>
  );
}
