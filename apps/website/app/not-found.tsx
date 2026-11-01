import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default function NotFound() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
        404
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-5 text-[var(--text-secondary)]">
        The page you requested does not exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white"
      >
        Back to Servora
      </Link>
    </section>
  );
}
