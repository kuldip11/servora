"use client";
import { useEffect, useState } from "react";

const KEY = "servora_cookie_consent";
export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const open = () => setVisible(true);
    setVisible(!localStorage.getItem(KEY));
    window.addEventListener("servora:open-cookie-settings", open);
    return () =>
      window.removeEventListener("servora:open-cookie-settings", open);
  }, []);
  if (!visible) return null;
  function choose(value: "accepted" | "essential") {
    localStorage.setItem(KEY, value);
    window.dispatchEvent(new Event("servora:consent-changed"));
    setVisible(false);
  }
  return (
    <aside
      role="dialog"
      aria-label="Cookie preferences"
      className="cookie-dialog"
    >
      <h2 className="font-semibold">Cookies</h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        We use essential cookies to operate the site. Optional analytics should
        only be enabled after consent.
      </p>
      <div className="cookie-actions">
        <button
          onClick={() => choose("accepted")}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
        >
          Accept optional cookies
        </button>
        <button
          onClick={() => choose("essential")}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold"
        >
          Essential only
        </button>
      </div>
    </aside>
  );
};
