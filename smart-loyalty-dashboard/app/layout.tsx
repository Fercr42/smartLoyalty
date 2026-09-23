import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { I18nProvider } from "./i18n/client";
import { getI18n } from "./i18n/server";
import { SITE_URL } from "./lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { m, locale } = await getI18n();
  const title = m.landing.metaTitle;
  const description = m.common.appDescription;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: "Smart Loyalty", template: "%s" },
    description,
    applicationName: "Smart Loyalty",
    alternates: { canonical: "/" },
    openGraph: { type: "website", url: SITE_URL, siteName: "Smart Loyalty", title, description, locale },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, m } = await getI18n();
  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <I18nProvider locale={locale} messages={m}>
          <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
