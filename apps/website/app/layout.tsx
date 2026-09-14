import { Analytics } from "@/components/analytics/Analytics";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { CookieConsent } from "@/components/privacy/CookieConsent";
import {
  BRAND_ASSETS,
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  getSiteUrl,
} from "@/lib/seo";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: DEFAULT_TITLE,
    template: "%s | Servora",
  },
  description: DEFAULT_DESCRIPTION,
  icons: {
    icon: [
      { url: BRAND_ASSETS.faviconSvg, type: "image/svg+xml" },
      { url: BRAND_ASSETS.faviconIco },
    ],
    apple: BRAND_ASSETS.appleTouchIcon,
  },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "Servora",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <CookieConsent />
        <Analytics />
      </body>
    </html>
  );
}
