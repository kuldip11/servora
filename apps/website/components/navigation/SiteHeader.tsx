"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { Brand } from "@/components/brand/Brand";
import { workspaces } from "@/content/product";
import { track } from "@/lib/analytics";
export function SiteHeader() {
  const [productOpen, setProductOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const productButton = useRef<HTMLButtonElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const path = usePathname();
  const close = () => {
    setProductOpen(false);
    setMobileOpen(false);
  };
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) {
        setProductOpen(false);
        setMobileOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (mobileOpen) menuButton.current?.focus();
        else if (productOpen) productButton.current?.focus();
        setProductOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [productOpen, mobileOpen]);
  return (
    <header className="site-header" ref={header}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="container header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Primary navigation">
          <button
            ref={productButton}
            type="button"
            aria-expanded={productOpen}
            aria-controls="product-menu"
            onClick={() => setProductOpen(!productOpen)}
          >
            Product
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          {[
            ["/demo", "Try the workflow"],
            ["/pricing", "Pricing"],
            ["/contact", "Contact"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href!}
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
          <Link
            href="/book-a-demo"
            className="action"
            onClick={() => {
              close();
              track({ event: "nav_cta_click", location: "header" });
            }}
          >
            Request a demo
          </Link>
          <button
            className="menu-toggle"
            ref={menuButton}
            aria-label="Menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X aria-hidden="true" />
            ) : (
              <Menu aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      {productOpen ? (
        <nav
          className="product-menu container"
          id="product-menu"
          aria-label="Product navigation"
        >
          <div>
            {workspaces.map((p) => (
              <Link key={p.slug} href={`/product/${p.slug}`} onClick={close}>
                <strong>{p.name}</strong>
                <span>{p.intro}</span>
              </Link>
            ))}
          </div>
          <Link href="/product" className="text-link" onClick={close}>
            Explore the full product →
          </Link>
        </nav>
      ) : null}
      {mobileOpen ? (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="mobile-navigation"
        >
          {[
            ["/product", "Product"],
            ["/demo", "Try the workflow"],
            ["/pricing", "Pricing"],
            ["/contact", "Contact"],
            ["/apps", "Applications"],
            ["/login", "Sign in"],
          ].map(([href, label]) => (
            <Link key={href} href={href!} onClick={close}>
              {label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
