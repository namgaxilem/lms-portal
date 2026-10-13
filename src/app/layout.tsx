import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AntdProvider from "@/components/providers/AntdProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getLocale } from "@/i18n/server";
import { brand } from "@/config/brand";
import { BrandStyle } from "@/config/BrandStyle";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: brand.openGraph.title,
    template: `%s | ${brand.shortName}`,
  },
  description: brand.openGraph.description,
  keywords: brand.seo.keywords,
  authors: [{ name: brand.seo.author }],
  creator: brand.seo.author,
  publisher: brand.seo.author,
  robots: "index, follow",
  openGraph: {
    title: brand.openGraph.title,
    description: brand.openGraph.description,
    url: brand.openGraph.url,
    siteName: brand.name,
    locale: "en_US",
    type: brand.openGraph.type as any,
    ...(brand.openGraph.image && { images: [{ url: brand.openGraph.image }] }),
  },
  twitter: {
    card: "summary_large_image",
    title: brand.openGraph.title,
    description: brand.openGraph.description,
    ...(brand.openGraph.image && { images: [brand.openGraph.image] }),
  },
  icons: {
    icon: brand.favicon,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${inter.variable} h-full antialiased`}
      // The theme script below adds `dark` before hydration.
      suppressHydrationWarning
    >
      <head>
        {/* Apply the saved (or system) theme before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      {/* Browser extensions often inject attributes on <body>. */}
      <body className="min-h-full bg-canvas text-fg" suppressHydrationWarning>
        <BrandStyle />
        <ThemeProvider>
          <I18nProvider initialLocale={locale}>
            <AntdProvider>{children}</AntdProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
