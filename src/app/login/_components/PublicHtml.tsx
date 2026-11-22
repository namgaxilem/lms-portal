"use client";
import { useMemo, useSyncExternalStore } from "react";
import DOMPurify from "dompurify";
import { cn } from "@/components/ui";

const noopSubscribe = () => () => {};

/**
 * Admin-written Moodle HTML shown to signed-out visitors (sign-in instructions,
 * maintenance message). Unlike RichText it only sanitizes: links and images are
 * left pointing at Moodle, because the portal routes and the file proxy behind
 * RichText's rewriting need a session. Links open in a new tab. Text colour and
 * size are inherited, so it also fits inside a coloured notice.
 */
export function PublicHtml({ html, className }: { html: string; className?: string }) {
  // DOMPurify needs the DOM: fill in after hydration so server and first client render agree.
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const clean = useMemo(() => {
    if (!isClient) return "";
    const fragment = DOMPurify.sanitize(html, {
      RETURN_DOM_FRAGMENT: true,
      FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select"],
    });
    fragment.querySelectorAll("a[href]").forEach((a) => {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    });
    const div = document.createElement("div");
    div.appendChild(fragment);
    return div.innerHTML;
  }, [html, isClient]);

  return (
    <div
      className={cn("rich-text", className)}
      // Sanitized above with DOMPurify.
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
