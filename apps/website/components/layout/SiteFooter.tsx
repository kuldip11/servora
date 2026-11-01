"use client";
import Link from "next/link";
import { Brand } from "@/components/brand/Brand";
import { workspaces } from "@/content/product";
import { servoraApps } from "@/lib/servora-apps";
import { track } from "@/lib/analytics";
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Brand />
          <p>
            Restaurant POS and operations.
            <br />A shared view of service.
          </p>
          <Link
            className="text-link"
            href="/book-a-demo"
            onClick={() =>
              track({ event: "nav_cta_click", location: "footer" })
            }
          >
            Request a demo ↗
          </Link>
        </div>
        <nav aria-label="Footer product links">
          <h2>Product</h2>
          {workspaces.map((p) => (
            <Link key={p.slug} href={`/product/${p.slug}`}>
              {p.name}
            </Link>
          ))}
          <Link href="/product">Management capabilities</Link>
          <Link href="/demo">Try the workflow</Link>
        </nav>
        <nav aria-label="Footer company links">
          <h2>Talk to us</h2>
          <Link href="/pricing">Pricing</Link>
          <Link href="/book-a-demo">Book a demo</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/cookies">Cookies</Link>
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new Event("servora:open-cookie-settings"))
            }
          >
            Cookie settings
          </button>
        </nav>
        <nav aria-label="Application links">
          <h2>Your workspace</h2>
          {servoraApps.map((app) => (
            <a href={app.href} key={app.key}>
              {app.shortName} ↗
            </a>
          ))}
          <Link href="/login">Sign in</Link>
          <Link href="/apps">All applications</Link>
        </nav>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Servora</span>
        <span>Built around restaurant service.</span>
      </div>
    </footer>
  );
}
