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

  return (
    // `layer` emits antd styles into @layer antd; see globals.css for the order
    // that lets Tailwind utilities win without breaking antd component styles.
    <AntdRegistry layer>
      <ConfigProvider
        locale={ANTD_LOCALE[locale]}
        theme={{
          algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: brand.colors.primary,
            colorInfo: brand.colors.primary,
            colorLink: brand.colors.primary,
            colorSuccess: brand.colors.success,
            colorWarning: brand.colors.warning,
            colorError: brand.colors.error,
            ...(dark ? {} : { colorTextBase: "#0b1c30" }),
            borderRadius: brand.borderRadius,
            fontFamily: "var(--font-inter), Inter, Arial, sans-serif",
          },
          components: {
            Table: { borderRadius: 12, headerBg: dark ? "#18212f" : "#eff4ff" },
            Select: { borderRadius: 12 },
            Segmented: { borderRadius: 999 },
          },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
