import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { Navbar } from "@/components/layout/Navbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { SyncStatusBadge } from "@/components/offline/SyncStatusBadge";
import { LocaleProvider } from "@/components/layout/LocaleProvider";
import { FirstLoadExperience } from "@/components/motion/FirstLoadExperience";
import { Locale } from "@/lib/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Maitri — Livestock Health & Veterinary Surveillance Platform",
  description: "Livestock disease early detection, rural field surveillance, and clinical decision support for farmers, veterinarians, and district authorities.",
  manifest: "/manifest.json",
  alternates: {
    languages: {
      en: "/",
      bn: "/",
      hi: "/",
      mr: "/",
      "x-default": "/",
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#F3EFE5",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#F3EFE5] text-[#20271F] selection:bg-[#B9C69E] selection:text-[#20271F] pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] xl:pb-0">
        <meta name="language" content={locale} />
        <ClerkProvider>
          <NextIntlClientProvider messages={messages} locale={locale}>
            <LocaleProvider initialLocale={locale as Locale}>
              <FirstLoadExperience />
              <PwaRegister />
              <Navbar />
              <main className="flex-1 flex flex-col">{children}</main>
              <SyncStatusBadge />
              <MobileNav />
            </LocaleProvider>
          </NextIntlClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
