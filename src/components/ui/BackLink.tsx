import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "./cn";

/** "Back to …" link above a detail page: muted, brand colour on hover, a 40px target and a visible focus ring. */
export function BackLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "-ml-2 inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-muted transition-colors hover:text-primary-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className
      )}
    >
      <ArrowLeft size={16} strokeWidth={2} aria-hidden className="shrink-0" />
      <span className="truncate">{children}</span>
    </Link>
  );
}
