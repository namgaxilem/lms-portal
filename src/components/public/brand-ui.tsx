import { cn } from "@/components/ui";

/**
 * Small brand pieces shared by the public pages and the app shell. Plain
 * markup only, so they work in server and client components alike.
 */

const MARK_SIZES = {
  md: "size-10 rounded-xl p-1",
  lg: "size-11 rounded-2xl p-1",
  xl: "size-12 rounded-2xl p-1.5 lg:size-14",
};

/**
 * The school's logo on a white tile, on every background and in both themes:
 * logos are made for light backgrounds. `alt` stays empty when the school's
 * name is written next to it.
 */
export function BrandMark({
  src,
  size,
  alt = "",
  className,
}: {
  src: string;
  size: keyof typeof MARK_SIZES;
  alt?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden bg-white shadow-md shadow-primary/15 ring-1 ring-black/5",
        MARK_SIZES[size],
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- BRAND_LOGO_MARK may be an external URL */}
      <img src={src} alt={alt} className="size-full object-contain" />
    </span>
  );
}

/** `tel:` link for a support phone number as written in the brand config. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
