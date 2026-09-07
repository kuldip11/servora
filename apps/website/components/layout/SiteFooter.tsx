import Link from "next/link";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { CookieSettingsButton } from "@/components/privacy/CookieSettingsButton";
import { servoraApps } from "@/lib/servora-apps";

export const SiteFooter = () => {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-2">
          <Link href="/" className="text-xl font-bold tracking-tight">
            servora<span className="text-primary">.</span>
          </Link>
          <p className="mt-4 max-w-md text-sm leading-6 text-text-secondary">
            A connected restaurant operations platform for orders, kitchen,
            billing, staff, inventory and customer QR ordering.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Product</h2>
          <ul className="mt-4 space-y-3 text-sm text-text-secondary">
            <li>
              <Link className="hover:text-text-primary" href="/product">
                Overview
              </Link>
            </li>
            <li>
              <Link
                className="hover:text-text-primary"
                href="/product/pos-and-orders"
              >
                POS & Orders
              </Link>
            </li>
            <li>
              <Link
                className="hover:text-text-primary"
                href="/product/qr-ordering"
              >
                QR Ordering
              </Link>
            </li>
            <li>
              <Link
                className="hover:text-text-primary"
                href="/product/kitchen-display"
              >
                Kitchen Display
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Servora Apps</h2>
          <ul className="mt-4 space-y-3 text-sm text-text-secondary">
            {servoraApps.map((app) => (
              <li key={app.key}>
                <a className="hover:text-text-primary" href={app.href}>
                  {app.shortName}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Company</h2>
          <ul className="mt-4 space-y-3 text-sm text-text-secondary">
            <li>
              <Link className="hover:text-text-primary" href="/pricing">
                Pricing
              </Link>
            </li>
            <li>
              <TrackedLink
                tracking={{ kind: "navigation", location: "footer" }}
                className="hover:text-text-primary"
                href="/book-a-demo"
              >
                Book a Demo
              </TrackedLink>
            </li>
            <li>
              <Link className="hover:text-text-primary" href="/contact">
                Contact
              </Link>
            </li>
            <li>
              <Link className="hover:text-text-primary" href="/login">
                Sign In
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--border)] px-6 py-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs text-text-secondary sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} Servora. Product claims reflect current
            capabilities.
          </span>
          <div className="flex flex-wrap gap-5">
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/cookies">Cookies</Link>
            <CookieSettingsButton>Cookie settings</CookieSettingsButton>
          </div>
        </div>
      </div>
    </footer>
  );
};
