"use client";
import { Segmented } from "antd";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { locales, type Locale } from "@/i18n/config";

/** Each language's own name: shown on hover and read after its code. */
const ENDONYMS: Record<Locale, string> = { vi: "Tiếng Việt", en: "English" };

/**
 * VI / EN toggle at the default 40px control height (a comfortable touch
 * target). Persists the choice to the `lang` cookie, then reloads the page:
 * server-rendered text switches language, and so does everything read from
 * Moodle (requests carry the UI language, and cached responses are dropped).
 */
export function LangSwitcher() {
  const t = useT();
  const { locale, setLocale } = useLocale();
  return (
    <Segmented<Locale>
      aria-label={t("shell.language")}
      value={locale}
      onChange={(next) => {
        setLocale(next);
        window.location.reload();
      }}
      options={locales.map((l) => ({
        value: l,
        title: ENDONYMS[l],
        label: (
          <>
            {l.toUpperCase()}
            <span lang={l} className="sr-only">
              {` ${ENDONYMS[l]}`}
            </span>
          </>
        ),
      }))}
      className="shrink-0 font-semibold"
    />
  );
}
