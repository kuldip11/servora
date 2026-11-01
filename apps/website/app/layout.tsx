import { Analytics } from "@/components/analytics/Analytics";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { CookieConsent } from "@/components/privacy/CookieConsent";
import { BRAND_ASSETS, getSiteUrl } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: websitePageSeo.home.title,
    template: "%s | Servora",
  },
  description: websitePageSeo.home.description,
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
    title: websitePageSeo.home.title,
    description: websitePageSeo.home.description,
  },
  twitter: {
    card: "summary_large_image",
    title: websitePageSeo.home.title,
    description: websitePageSeo.home.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex flex-col">
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
