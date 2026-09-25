import type { Metadata, Viewport } from "next";
import { Caveat, Caveat_Brush, Nunito } from "next/font/google";
import type { ReactNode } from "react";
import { SettingsProvider } from "@/components/providers/SettingsProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { SiteFooter } from "@/components/layout/SiteFooter";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cross-line.pages.dev";
const TITLE = "Crossline — A Tactical 3×3 Strategy Game";
const DESCRIPTION =
  "Three pieces. One line. Outsmart your rival. Crossline is a fast 1v1 tactical board game: slide your three marks one square at a time and complete a line before your opponent does. Play vs bot, local, or online.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s · Crossline" },
  description: DESCRIPTION,
  applicationName: "Crossline",
  keywords: ["crossline", "strategy game", "3x3 board game", "tactical game", "1v1", "tic tac toe variant"],
  authors: [{ name: "Crossline" }],
  creator: "Crossline",
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: "Three pieces. One line. Outsmart your rival.",
    url: SITE_URL,
    type: "website",
    siteName: "Crossline",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Crossline — Three pieces. One line. Outsmart your rival." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Crossline — A Tactical 3×3 Strategy Game",
    description: "Three pieces. One line. Outsmart your rival.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
  // Single authoritative favicon config. `?v=2` cache-busts browsers that
  // pinned the pre-launch icon: a new URL forces a fresh fetch everywhere
  // (tab icon, bookmarks, shortcuts) instead of serving the stale entry.
  icons: {
    icon: [
      { url: "/icon.svg?v=2", type: "image/svg+xml" },
      { url: "/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
    ],
    shortcut: ["/icon.svg?v=2"],
    apple: [{ url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f1e3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

const displayFont = Caveat_Brush({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const handFont = Caveat({ weight: ["500", "600", "700"], subsets: ["latin"], variable: "--font-hand" });
const sansFont = Nunito({
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-sans",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "Crossline",
        url: SITE_URL,
        description: DESCRIPTION,
      },
      {
        "@type": "VideoGame",
        name: "Crossline",
        url: SITE_URL,
        description: "Three pieces. One line. Outsmart your rival. A fast 1v1 tactical board game on a 3×3 grid: slide one of your three marks to an adjacent square each turn — first to line up all three wins.",
        genre: ["Strategy", "Board Game"],
        gamePlatform: "Web browser",
        applicationCategory: "Game",
        operatingSystem: "Any",
        numberOfPlayers: { "@type": "QuantitativeValue", value: 2 },
        offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
      },
    ],
  };
  return (
    <html lang="en" suppressHydrationWarning className={`${displayFont.variable} ${handFont.variable} ${sansFont.variable}`}>
      <body className="min-h-dvh antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <SettingsProvider>
          <ToastProvider>
            <div className="flex min-h-dvh flex-col">
              <div className="flex-1">{children}</div>
              <SiteFooter />
            </div>
          </ToastProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
