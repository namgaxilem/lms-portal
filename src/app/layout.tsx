import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
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

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700", "800"],
  variable: "--font-jakarta",
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
  themeColor: brand.seo.themeColor,
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
      className={`${inter.variable} ${jakarta.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Material Symbols icon font. next/font can't host this variable icon
            font cleanly, so it's linked directly. display=block avoids a flash
            of the raw ligature text while the font loads. */}
        {/* eslint-disable @next/next/no-page-custom-font, @next/next/google-font-display */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
        {/* eslint-enable @next/next/no-page-custom-font, @next/next/google-font-display */}
        {/* Apply the saved (or system) theme before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full bg-background text-on-background">
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
