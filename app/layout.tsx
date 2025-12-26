import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import GlobalBanGuard from "@/components/GlobalBanGuard";
import { AffiliateLinkProvider } from "@/context/AffiliateLinkContext";

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
  icons: {
    icon: [
      { url: "/logo.png" },
      { url: "/logo.png", sizes: "16x16", type: "image/png" },
      { url: "/logo.png", sizes: "32x32", type: "image/png" },
      { url: "/logo.png", sizes: "48x48", type: "image/png" },
      { url: "/logo.png", sizes: "96x96", type: "image/png" },
      { url: "/logo.png", sizes: "144x144", type: "image/png" },
      { url: "/logo.png", sizes: "192x192", type: "image/png" },
      { url: "/logo.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/logo.png",
    apple: [
      { url: "/logo.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "ティアリスト.com",
    description: "みんなで決める、最強のティアリスト。ティアリスト.comは、アニメ、ゲーム、あらゆるジャンルのティアリストを作成・共有・投票できるコミュニティサイトです。",
    url: "https://tier-lst.com",
    siteName: "ティアリスト.com",
    images: [
      {
        url: "/logo.png",
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
    images: ["/logo.png"],
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AffiliateLinkProvider>
          <GlobalBanGuard />
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
          <footer id="global-footer" className="w-full border-t border-border/40 py-6 text-center text-sm text-muted-foreground bg-gray-50 dark:bg-zinc-900 flex flex-col gap-2 items-center">
            <p>
              &copy; {new Date().getFullYear()} ティアリスト.com. All rights reserved. <span className="ml-2">Ver.0.0.71</span>
            </p>
            <nav className="flex gap-4">
              <a href="/terms" className="hover:underline underline-offset-4">利用規約</a>
              <a href="/privacy" className="hover:underline underline-offset-4">プライバシーポリシー</a>
              <a href="/contact" className="hover:underline underline-offset-4">お問い合わせ</a>
            </nav>
          </footer>
        </AffiliateLinkProvider>
      </body>
    </html>
  );
}
