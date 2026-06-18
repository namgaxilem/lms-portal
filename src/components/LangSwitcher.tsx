"use client";
import { Segmented } from "antd";
import { GlobalOutlined } from "@ant-design/icons";
import { useLocale } from "@/i18n/I18nProvider";
import { locales, type Locale } from "@/i18n/config";

/** Compact VI / EN toggle. Persists choice to the `lang` cookie. */
export function LangSwitcher() {
  const { locale, setLocale } = useLocale();
  return (
    <Segmented
      value={locale}
      onChange={(v) => setLocale(v as Locale)}
      options={locales.map((l) => ({
        value: l,
        label: (
          <span className="flex items-center gap-1">
            {l === locale ? <GlobalOutlined /> : null}
            {l.toUpperCase()}
          </span>
        ),
      }))}
    />
  );
}
