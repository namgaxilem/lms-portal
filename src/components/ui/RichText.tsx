"use client";
import { useMemo, useSyncExternalStore } from "react";
import DOMPurify from "dompurify";
import { fileUrl, isMoodleFile } from "@/lib/moodle/files";
import { moodlePath, portalRouteForMoodleUrl } from "@/lib/moodle/links";
import { cn } from "./cn";

const noopSubscribe = () => () => {};

/**
 * Renders Moodle rich text (HTML) safely: sanitized with DOMPurify, Moodle
 * pluginfile links/images routed through the authenticated file proxy, links
 * into the Moodle UI rewritten to portal routes (or unwrapped), and external
 * links opened in a new tab. Plain text (format 2) can be passed with `plain`.
 */
export function RichText({
  html,
  plain,
  className,
}: {
  html?: string | null;
  /** Render as plain text with line breaks instead of HTML. */
  plain?: boolean;
  className?: string;
}) {
  // DOMPurify needs the DOM: render the HTML only after hydration so the server
  // and first client render agree (both empty), then fill in.
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const clean = useMemo(() => {
    if (!html || plain || !isClient) return "";
    const fragment = DOMPurify.sanitize(html, {
      RETURN_DOM_FRAGMENT: true,
      FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select"],
      ADD_ATTR: ["target"],
    });
    fragment.querySelectorAll<HTMLElement>("[src],[href]").forEach((el) => {
      for (const attr of ["src", "href"] as const) {
        const value = el.getAttribute(attr);
        if (isMoodleFile(value)) el.setAttribute(attr, fileUrl(value));
      }
      if (el.tagName === "A") {
        const href = el.getAttribute("href");
        if (moodlePath(href) && !isMoodleFile(href)) {
          // Never send users into the Moodle UI: map to the portal page, or
          // keep just the link text when the portal has no equivalent.
          const route = portalRouteForMoodleUrl(href);
          if (route) el.setAttribute("href", route);
          else el.replaceWith(...Array.from(el.childNodes));
          return;
        }
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
    });
    const div = document.createElement("div");
    div.appendChild(fragment);
    return div.innerHTML;
  }, [html, plain, isClient]);

  if (!html) return null;
  if (plain) {
    return <div className={cn("whitespace-pre-wrap text-sm text-fg", className)}>{html}</div>;
  }
  return (
    <div
      className={cn("rich-text text-sm text-fg", className)}
      // Sanitized above with DOMPurify.
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
