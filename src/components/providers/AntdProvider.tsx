"use client";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider, theme } from "antd";
import enUS from "antd/locale/en_US";
import viVN from "antd/locale/vi_VN";
import { brand } from "@/config/brand";
import { useLocale } from "@/i18n/I18nProvider";
import { useTheme } from "@/components/providers/ThemeProvider";

const ANTD_LOCALE = { vi: viVN, en: enUS };

export default function AntdProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale } = useLocale();
  const { dark } = useTheme();
  const primary = dark ? brand.colors.primaryDark : brand.colors.primary;

  return (
    // `layer` emits antd styles into @layer antd; see globals.css for the order
    // that lets Tailwind utilities win without breaking antd component styles.
    <AntdRegistry layer>
      <ConfigProvider
        locale={ANTD_LOCALE[locale]}
        theme={{
          algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          // Mirrors the semantic tokens in globals.css so antd controls sit
          // flush with the hand-built Tailwind UI.
          token: {
            colorPrimary: primary,
            colorInfo: primary,
            colorLink: dark ? "#8fb4f2" : brand.colors.primary,
            colorSuccess: brand.colors.success,
            colorWarning: brand.colors.warning,
            colorError: brand.colors.error,
            colorTextBase: dark ? "#fafafa" : "#18181b",
            colorBgBase: dark ? "#09090b" : "#ffffff",
            colorBgContainer: dark ? "#111113" : "#ffffff",
            colorBgElevated: dark ? "#18181b" : "#ffffff",
            colorBorder: dark ? "#3f3f46" : "#d4d4d8",
            colorBorderSecondary: dark ? "#27272a" : "#e4e4e7",
            colorFillAlter: dark ? "#18181b" : "#fafafa",
            borderRadius: brand.borderRadius,
            borderRadiusLG: 12,
            fontSize: 14,
            controlHeight: 36,
            fontFamily: "var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif",
            boxShadowSecondary:
              "0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px rgb(0 0 0 / 0.08)",
          },
          components: {
            Table: {
              headerBg: dark ? "#18181b" : "#fafafa",
              headerColor: dark ? "#a1a1aa" : "#52525b",
              headerSplitColor: "transparent",
              rowHoverBg: dark ? "#18181b" : "#fafafa",
              cellPaddingBlock: 12,
            },
            Segmented: {
              borderRadius: 8,
              itemSelectedBg: dark ? "#27272a" : "#ffffff",
              trackBg: dark ? "#18181b" : "#f4f4f5",
            },
            Dropdown: { paddingBlock: 8 },
            Drawer: { paddingLG: 16 },
          },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
