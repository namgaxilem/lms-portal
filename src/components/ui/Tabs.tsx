"use client";
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./cn";

export interface TabItem<K extends string> {
  key: K;
  label: ReactNode;
  count?: number;
}

const tabId = (base: string, key: string) => `${base}-tab-${key}`;
const panelId = (base: string, key: string) => `${base}-panel-${key}`;

/**
 * Props for the panel of the active tab: `<div {...tabPanelProps("course", tab)}>`.
 * Use the same `id` as the <Tabs> that controls it.
 */
export function tabPanelProps(id: string, key: string) {
  return { id: panelId(id, key), role: "tabpanel" as const, "aria-labelledby": tabId(id, key), tabIndex: 0 };
}

/**
 * Controlled tab bar (WAI-ARIA tabs: roving tabindex, arrow/Home/End keys).
 * `pill` (default) = segmented control with a gradient active tab;
 * `underline` = classic underline tabs for dense screens. Pass `id` and render
 * the content with tabPanelProps(id, value) to link tabs and panel.
 */
export function Tabs<K extends string>({
  items,
  value,
  onChange,
  id,
  variant = "pill",
  className,
  "aria-label": ariaLabel,
}: {
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  id?: string;
  variant?: "pill" | "underline";
  className?: string;
  "aria-label"?: string;
}) {
  const autoId = useId();
  const base = id ?? autoId;
  const listRef = useRef<HTMLDivElement>(null);
  const pill = variant === "pill";

  const onKeyDown = (e: KeyboardEvent) => {
    const index = items.findIndex((it) => it.key === value);
    const next = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: items.length - 1,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const target = items[(next + items.length) % items.length];
    onChange(target.key);
    listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(tabId(base, target.key))}`)?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        "flex overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        pill ? "w-fit max-w-full gap-1 rounded-2xl bg-surface p-1.5 shadow-card ring-1 ring-line/60 dark:ring-line" : "gap-6 border-b border-line",
        className
      )}
    >
      {items.map((it) => {
        const active = it.key === value;
        return (
          <button
            key={it.key}
            id={tabId(base, it.key)}
            role="tab"
            type="button"
            aria-selected={active}
            aria-controls={panelId(base, it.key)}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(it.key)}
            className={cn(
              "flex shrink-0 items-center gap-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              pill
                ? cn(
                    "rounded-xl px-4 py-2",
                    active ? "bg-brand-gradient text-white shadow-md shadow-primary/25" : "text-subtle hover:bg-surface-2 hover:text-fg"
                  )
                : cn("-mb-px border-b-2 pb-3 pt-1", active ? "border-primary text-fg" : "border-transparent text-subtle hover:text-fg")
            )}
          >
            {it.label}
            {it.count !== undefined && (
              <span
                className={cn(
                  "min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums",
                  pill && active ? "bg-white/25 text-white" : active ? "bg-primary text-primary-fg" : "bg-surface-2 text-subtle"
                )}
              >
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
