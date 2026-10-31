import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};
export default function NotFound() {
  return (
    <section className="utility-page">
      <h1>Page not found.</h1>
      <p>The page you requested does not exist or has moved.</p>
      <Link className="site-button" href="/">
        Back to Servora
      </Link>
    </section>
  );
}
