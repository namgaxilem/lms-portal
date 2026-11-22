import Link from "next/link";
import type { ReactNode } from "react";

/**
 * "View all →" link for a SectionTitle action slot: a 40px tap target that does
 * not make the heading row taller, with the arrow hidden from screen readers.
 */
export function SectionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="-mx-2 -my-2 inline-flex min-h-10 items-center gap-1 rounded-control px-2 hover:underline">
      {children}
      <span aria-hidden>→</span>
    </Link>
  );
}
