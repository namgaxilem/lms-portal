import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";
import AntdProvider from "@/components/providers/AntdProvider";
import { BrandProvider } from "@/components/providers/BrandProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getLocale } from "@/i18n/server";
import { sidebarColors } from "@/config/brand";
import { getBrand } from "@/config/brand.server";
import { BrandStyle } from "@/config/BrandStyle";
import { portalConfigScript } from "@/lib/public-config";

// Designed for Vietnamese: proper diacritic spacing at every weight.
const sans = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-brand",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  // Brand comes from runtime env vars: resolve per request, not at build time.
  await connection();
  const brand = getBrand();
  const title = `${brand.appName} · ${brand.name}`;
  return {
    title: { default: title, template: `%s | ${brand.shortName}` },
    description: brand.description,
    applicationName: brand.appName,
    openGraph: {
      title,
      description: brand.description,
      url: brand.url,
      siteName: brand.name,
      type: "website",
    },
    icons: { icon: brand.favicon },
  };
}

export async function generateViewport(): Promise<Viewport> {
  // The phone browser bar continues the school-coloured top bar (runtime brand).
  await connection();
  const nav = sidebarColors(getBrand());
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: nav.light },
      { media: "(prefers-color-scheme: dark)", color: nav.dark },
    ],
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const brand = getBrand();

  return (
    <html
      lang={locale}
      className={`${sans.variable} h-full antialiased`}
      // The theme script below adds `dark` before hydration.
      suppressHydrationWarning
    >
      <head>
        <BrandStyle brand={brand} />
        {/* Runtime client config (Moodle URL) — one build serves any school. */}
        <script dangerouslySetInnerHTML={{ __html: portalConfigScript() }} />
        {/* Apply the saved (or system) theme before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      {/* Browser extensions often inject attributes on <body>. */}
      <body className="min-h-full bg-canvas text-fg" suppressHydrationWarning>
        <BrandProvider brand={brand}>
          <ThemeProvider>
            <I18nProvider initialLocale={locale}>
              <AntdProvider>{children}</AntdProvider>
            </I18nProvider>
          </ThemeProvider>
        </BrandProvider>
      </body>
    </html>
  );
}
