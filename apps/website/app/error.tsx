"use client";

import { websiteLogger } from "@/lib/logger";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    websiteLogger.error("website.application_error", error);
  }, [error]);
  return (
    <section className="utility-page">
      <h1 className="text-4xl font-bold">Something went wrong</h1>
      <p className="mt-4 text-[var(--text-secondary)]">
        We couldn’t load this page. Please try again.
      </p>
      <button onClick={() => reset()} className="site-button">
        Try again
      </button>
    </section>
  );
}
