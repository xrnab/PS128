import { Suspense } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { Navbar } from "@/components/layout/Navbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { NavigationProgressBar } from "@/components/layout/NavigationProgressBar";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { SyncStatusBadge } from "@/components/offline/SyncStatusBadge";
import { LocaleProvider } from "@/components/layout/LocaleProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { FirstLoadExperience } from "@/components/motion/FirstLoadExperience";
import { SmoothScrollProvider } from "@/components/motion/SmoothScrollProvider";
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
  description:
    "Livestock disease early detection, rural field surveillance, and clinical decision support for farmers, veterinarians, and district authorities.",
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
  themeColor: "#FBF8F3",
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('maitri-theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#FBF8F3] dark:bg-[#080F0C] text-[#1D1C14] dark:text-[#F4EEE1] selection:bg-[#3F6B4A]/20 selection:text-[#1E3A2B] pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] xl:pb-0 relative transition-colors duration-300">
        {/* Ambient Depth Mesh Gradient (Cached GPU Layer, 0ms Scroll Overhead) */}
        <div className="ambient-mesh-bg" />

        <meta name="language" content={locale} />
        <ClerkProvider>
          <NextIntlClientProvider messages={messages} locale={locale}>
            <LocaleProvider initialLocale={locale as Locale}>
              <ThemeProvider>
                <SmoothScrollProvider>
                  <Suspense fallback={null}>
                    <NavigationProgressBar />
                  </Suspense>
                  <FirstLoadExperience />
                  <PwaRegister />
                  <Navbar />
                  <main className="flex-1 flex flex-col relative z-10">{children}</main>
                  <SyncStatusBadge />
                  <MobileNav />
                </SmoothScrollProvider>
              </ThemeProvider>
            </LocaleProvider>
          </NextIntlClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
