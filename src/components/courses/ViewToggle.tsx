"use client";
import { useSyncExternalStore } from "react";
import { ConfigProvider, Segmented, type ThemeConfig } from "antd";
import { LayoutGrid, List, type LucideIcon } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";

type CourseView = "grid" | "list";

/* The chosen view is a per-browser convenience kept in localStorage (which can
   be unavailable: private mode, blocked storage), with an in-memory fallback. */
const STORAGE_KEY = "courses.view";
const CHANGE_EVENT = "courses-view-change";
let memoryView: CourseView = "grid";

function readView(): CourseView {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "grid" || stored === "list") return stored;
  } catch {
    // Storage blocked: use the in-memory choice.
  }
  return memoryView;
}

function writeView(view: CourseView) {
  memoryView = view;
  try {
    localStorage.setItem(STORAGE_KEY, view);
  } catch {
    // Storage blocked: the in-memory choice still applies for this visit.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Grid/list preference for course lists, remembered in this browser. */
export function useCourseView() {
  const view = useSyncExternalStore<CourseView>(subscribe, readView, () => "grid");
  return [view, writeView] as const;
}

/* 44px tall like the UI kit's text inputs (inputClass h-11), so the toggle sits
   level with a search field; antd's own sizes are 40px (middle) and 50px (large). */
const TOGGLE_THEME: ThemeConfig = { components: { Segmented: { controlHeight: 44 } } };

/** Icon-only grid/list switch (antd Segmented, so it follows the antd theme). */
export function ViewToggle({ value, onChange }: { value: CourseView; onChange: (view: CourseView) => void }) {
  const t = useT();
  const option = (view: CourseView, Icon: LucideIcon, label: string) => ({
    value: view,
    title: label,
    label: (
      <span className="grid h-full place-items-center px-0.5">
        <Icon size={18} strokeWidth={1.85} aria-hidden />
        <span className="sr-only">{label}</span>
      </span>
    ),
  });
  return (
    <ConfigProvider theme={TOGGLE_THEME}>
      <Segmented<CourseView>
        aria-label={t("courses.viewMode")}
        value={value}
        onChange={onChange}
        options={[option("grid", LayoutGrid, t("common.gridView")), option("list", List, t("common.listView"))]}
      />
    </ConfigProvider>
  );
}
