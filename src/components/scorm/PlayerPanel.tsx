"use client";
import { useEffect, useEffectEvent, useRef, type ReactNode, type RefObject } from "react";
import { X } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Button, Tabs, cn, tabPanelProps } from "@/components/ui";

export type PanelTab = "parts" | "course";

interface PanelContentProps {
  id: string;
  /** Available tabs in order; one tab renders as a plain heading. */
  tabs: PanelTab[];
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  children: ReactNode;
  closeRef?: RefObject<HTMLButtonElement | null>;
  onClose?: () => void;
}

/** Tabs (or a heading), an optional close button, and the scrolling body. */
function PanelContent({ id, tabs, tab, onTab, children, closeRef, onClose }: PanelContentProps) {
  const t = useT();
  const bodyRef = useRef<HTMLDivElement>(null);
  const label = (key: PanelTab) => t(key === "parts" ? "scorm.parts" : "courses.contents");
  const tabbed = tabs.length > 1;

  // Bring the current part / activity into view when the panel opens or the tab changes.
  useEffect(() => {
    const box = bodyRef.current;
    const current = box?.querySelector<HTMLElement>("[aria-current]");
    if (box && current) box.scrollTop = current.offsetTop - (box.clientHeight - current.offsetHeight) / 2;
  }, [tab]);

  const close = onClose && (
    <Button
      ref={closeRef}
      variant="ghost"
      size="icon"
      onClick={onClose}
      aria-label={t("common.close")}
      className="absolute right-2 top-1.5"
    >
      <X size={18} strokeWidth={2} />
    </Button>
  );

  return (
    <>
      {tabbed ? (
        <div className="relative shrink-0">
          <h2 id={`${id}-title`} className="sr-only">
            {t("scorm.contents")}
          </h2>
          <Tabs
            id={id}
            variant="underline"
            items={tabs.map((key) => ({ key, label: label(key) }))}
            value={tab}
            onChange={onTab}
            aria-label={t("scorm.contents")}
            className={cn("px-4 pt-3", onClose && "pr-14")}
          />
          {close}
        </div>
      ) : (
        <div className="relative shrink-0 border-b border-line px-4 py-3.5">
          <h2 id={`${id}-title`} className={cn("text-sm font-extrabold text-fg", onClose && "pr-10")}>
            {label(tab)}
          </h2>
          {close}
        </div>
      )}
      <div
        ref={bodyRef}
        className="relative min-h-0 flex-1 overflow-y-auto p-2.5"
        {...(tabbed ? tabPanelProps(id, tab) : {})}
      >
        {children}
      </div>
    </>
  );
}

/** Wide screens: the panel as a sidebar next to the stage. */
export function PanelSidebar(props: Omit<PanelContentProps, "onClose" | "closeRef">) {
  return (
    <aside
      id={props.id}
      aria-labelledby={`${props.id}-title`}
      className="flex w-80 shrink-0 animate-fade-in flex-col overflow-hidden rounded-card border border-line/60 bg-surface shadow-card dark:border-line"
    >
      <PanelContent {...props} />
    </aside>
  );
}

/**
 * Phones, tablets and Moodle's "drop-down" TOC: the panel slides over the stage.
 * It sits inside the player, so it also works in element fullscreen, and it
 * overlays the SCO instead of moving or resizing its iframe (which would
 * restart the SCO). The caller makes the stage inert while it is open.
 */
export function PanelOverlay({ onClose, ...props }: Omit<PanelContentProps, "closeRef"> & { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onEscape = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  });

  // Focus the panel when it opens; Escape closes it.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => onEscape(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="absolute inset-0 z-20 flex animate-fade-in">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-slate-950/40" />
      <section
        id={props.id}
        aria-labelledby={`${props.id}-title`}
        className="relative flex h-full w-full max-w-sm flex-col border-r border-line bg-surface shadow-pop"
      >
        <PanelContent {...props} onClose={onClose} closeRef={closeRef} />
      </section>
    </div>
  );
}
