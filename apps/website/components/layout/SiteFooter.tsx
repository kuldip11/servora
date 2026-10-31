import Link from "next/link";
import { CookieSettingsButton } from "@/components/privacy/CookieSettingsButton";
import { servoraApps } from "@/lib/servora-apps";
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <h2>Ready for your next service?</h2>
        <Link className="site-button" href="/book-a-demo">
          Request a demo
        </Link>
      </div>
      <div className="footer-columns">
        <div>
          <p>
            Restaurant management software.
            <br />
            Built around the work of service.
          </p>
          <Link href="/product">Explore the product</Link>
        </div>
        <nav aria-label="Company">
          <Link href="/pricing">Pricing</Link>
          <Link href="/book-a-demo">Book a demo</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/login">Sign in</Link>
        </nav>
        <nav aria-label="Servora applications">
          {servoraApps.map((app) => (
            <a key={app.key} href={app.href}>
              {app.shortName}
            </a>
          ))}
        </nav>
        <nav aria-label="Legal">
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/cookies">Cookies</Link>
          <CookieSettingsButton>Cookie settings</CookieSettingsButton>
        </nav>
      </div>
      <div className="footer-wordmark" aria-hidden="true">
        servora↗
      </div>
      <p className="footer-copyright">© {new Date().getFullYear()} Servora</p>
    </footer>
  );
}
