import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import GlobalBanGuard from "@/components/GlobalBanGuard";
import { AffiliateLinkProvider } from "@/context/AffiliateLinkContext";
import { LoadingProvider } from "@/context/LoadingContext";
import NativeAppInitializer from "@/components/NativeAppInitializer";
import PageLoadingIndicator from "@/components/PageLoadingIndicator";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tier-lst.com"),
  title: "ティアリスト.com",
  description: "みんなで決める、最強のティアリスト。ティアリスト.comは、アニメ、ゲーム、あらゆるジャンルのティアリストを作成・共有・投票できるコミュニティサイトです。",
  openGraph: {
    title: "ティアリスト.com",
    description: "みんなで決める、最強のティアリスト。ティアリスト.comは、アニメ、ゲーム、あらゆるジャンルのティアリストを作成・共有・投票できるコミュニティサイトです。",
    url: "https://tier-lst.com",
    siteName: "ティアリスト.com",
    images: [
      {
        url: "https://tier-lst.com/logo.png",
        width: 512,
        height: 512,
        alt: "ティアリスト.com Logo",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ティアリスト.com",
    description: "みんなで決める、最強のティアリスト。ティアリスト.comは、アニメ、ゲーム、あらゆるジャンルのティアリストを作成・共有・投票できるコミュニティサイトです。",
    images: ["https://tier-lst.com/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <LoadingProvider>
          <NativeAppInitializer />
          <PageLoadingIndicator />
          <AffiliateLinkProvider>
            <GlobalBanGuard />
            <Navbar />
            <main className="min-h-screen">
              {children}
            </main>
            <footer id="global-footer" className="w-full border-t border-border/40 py-6 text-center text-sm text-muted-foreground bg-gray-50 dark:bg-zinc-900 flex flex-col gap-2 items-center">
              <p>
                &copy; {new Date().getFullYear()} ティアリスト.com. All rights reserved. <span className="ml-2">Ver.0.1.2</span>
              </p>
              <nav className="flex gap-4">
                <a href="/terms" className="hover:underline underline-offset-4">利用規約</a>
                <a href="/privacy" className="hover:underline underline-offset-4">プライバシーポリシー</a>
                <a href="/contact" className="hover:underline underline-offset-4">お問い合わせ</a>
              </nav>
            </footer>
          </AffiliateLinkProvider>
        </LoadingProvider>
      </body>
    </html>
  );
}
