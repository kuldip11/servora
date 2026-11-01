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
    <section className="container recovery-page">
      <h1 className="text-4xl font-bold">Something went wrong</h1>
      <p className="mt-4 text-[var(--text-secondary)]">
        We couldn’t load this page. Please try again.
      </p>
      <button
        onClick={() => reset()}
        className="mt-8 rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white"
      >
        Try again
      </button>
    </section>
  );
}
