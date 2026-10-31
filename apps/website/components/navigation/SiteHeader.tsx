"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { TrackedLink } from "@/components/analytics/TrackedLink";

const links = [
  ["/product", "Product"],
  ["/#interactive-demos", "Demos"],
  ["/pricing", "Pricing"],
  ["/apps", "Apps"],
  ["/contact", "Contact"],
] as const;
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setOpen(false);
  }, [path]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  return (
    <header className="site-header">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Link href="/" aria-label="Servora home" className="wordmark">
        servora<span aria-hidden="true">↗</span>
      </Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        {links.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={path === href ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <Link className="sign-in" href="/login">
          Sign in
        </Link>
        <TrackedLink
          className="site-button"
          href="/book-a-demo"
          tracking={{ kind: "navigation", location: "header" }}
        >
          Request a demo
        </TrackedLink>
        <button
          ref={toggle}
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          className="mobile-nav"
          aria-label="Mobile navigation"
        >
          {links.map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          <Link href="/login">Sign in</Link>
          <Link href="/book-a-demo">Request a demo</Link>
        </nav>
      )}
    </header>
  );
}
