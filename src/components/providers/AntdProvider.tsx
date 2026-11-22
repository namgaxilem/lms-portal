"use client";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider, theme } from "antd";
import enUS from "antd/locale/en_US";
import viVN from "antd/locale/vi_VN";
import { primaryOnDark } from "@/config/brand";
import { useBrand } from "@/components/providers/BrandProvider";
import { useLocale } from "@/i18n/I18nProvider";
import { useTheme } from "@/components/providers/ThemeProvider";

const ANTD_LOCALE = { vi: viVN, en: enUS };

/** Surface colours mirrored from the semantic tokens in globals.css. */
const SURFACES = {
  light: { text: "#0f172a", base: "#ffffff", container: "#ffffff", elevated: "#ffffff", border: "#d9dce7", borderSoft: "#e8eaf2", fill: "#f5f6fb", header: "#f7f8fc", headerText: "#475569", trackBg: "#eef0f6", selected: "#ffffff" },
  dark: { text: "#f1f5f9", base: "#0b0d14", container: "#12151f", elevated: "#181c28", border: "#323848", borderSoft: "#232838", fill: "#181c28", header: "#181c28", headerText: "#94a3b8", trackBg: "#181c28", selected: "#262c3d" },
};

export default function AntdProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  const { dark } = useTheme();
  const brand = useBrand();
  const primary = dark ? primaryOnDark(brand) : brand.colors.primary;
  const s = dark ? SURFACES.dark : SURFACES.light;

  return (
    // `layer` emits antd styles into @layer antd; see globals.css for the order
    // that lets Tailwind utilities win without breaking antd component styles.
    <AntdRegistry layer>
      <ConfigProvider
        locale={ANTD_LOCALE[locale]}
        theme={{
          algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: primary,
            colorInfo: primary,
            colorLink: primary,
            colorSuccess: brand.colors.success,
            colorWarning: brand.colors.warning,
            colorError: brand.colors.error,
            colorTextBase: s.text,
            colorBgBase: s.base,
            colorBgContainer: s.container,
            colorBgElevated: s.elevated,
            colorBorder: s.border,
            colorBorderSecondary: s.borderSoft,
            colorFillAlter: s.fill,
            borderRadius: 12,
            borderRadiusLG: 16,
            borderRadiusSM: 8,
            fontSize: 14,
            controlHeight: 40,
            fontFamily: "var(--font-brand), ui-sans-serif, system-ui, sans-serif",
            boxShadowSecondary: "0 1px 2px rgb(15 23 42 / 0.05), 0 12px 32px rgb(15 23 42 / 0.12)",
          },
          components: {
            Table: {
              headerBg: s.header,
              headerColor: s.headerText,
              headerSplitColor: "transparent",
              rowHoverBg: s.fill,
              cellPaddingBlock: 14,
            },
            Segmented: { borderRadius: 12, itemSelectedBg: s.selected, trackBg: s.trackBg },
            // The brand tint (globals.css), so the selected option follows each school's colour.
            Select: { optionSelectedBg: "var(--c-primary-soft)" },
            Dropdown: { paddingBlock: 8 },
            Drawer: { paddingLG: 16 },
            Modal: { borderRadiusLG: 20 },
          },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
