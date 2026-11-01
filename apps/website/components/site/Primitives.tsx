import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { TableMark } from "@/components/brand/Brand";
export function Action({
  href = "/book-a-demo",
  children = "Request a demo",
  secondary = false,
}: {
  href?: string;
  children?: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      className={`action ${secondary ? "action-secondary" : ""}`}
      href={href}
    >
      {children}
      <ArrowUpRight size={18} aria-hidden="true" />
    </Link>
  );
}
export function PageIntro({
  title,
  children,
  action = false,
}: {
  title: string;
  children: ReactNode;
  action?: boolean;
}) {
  return (
    <header className="page-intro container">
      <h1>{title}</h1>
      <div>
        <p className="lead">{children}</p>
        {action ? <Action /> : null}
      </div>
    </header>
  );
}
export function ClosingCta() {
  return (
    <section className="closing-cta">
      <div className="container closing-inner">
        <TableMark className="closing-mark" />
        <div>
          <h2>
            Let's talk about
            <br />
            your next shift.
          </h2>
          <p>
            Bring your tables, your team and the way you serve. Explore where
            Servora fits.
          </p>
          <Action />
        </div>
      </div>
    </section>
  );
}
