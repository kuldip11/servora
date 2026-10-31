"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const KEY = "servora_cookie_consent";

export const Analytics = () => {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const lastPage = useRef<string | null>(null);
  const [consent, setConsent] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      const value = window.localStorage.getItem(KEY);
      if (GA_ID)
        (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] =
          value !== "accepted";
      setConsent(value);
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener("servora:consent-changed", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("servora:consent-changed", read);
    };
  }, []);

  useEffect(() => {
    if (consent !== "accepted") {
      lastPage.current = null;
      return;
    }
    if (!ready || !pathname || lastPage.current === pathname) return;
    lastPage.current = pathname;
    track({
      event: "page_view",
      path: pathname,
      referrer: document.referrer || undefined,
    });
  }, [consent, ready, pathname]);

  if (!GA_ID || consent !== "accepted") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="servora-gtag"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      >
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:false});`}
      </Script>
    </>
  );
};
