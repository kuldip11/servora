import Link from "next/link";
import type { ReactNode } from "react";

export function PageIntro({
  title,
  children,
  aside,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="page-intro">
      <div>
        <h1>{title}</h1>
        <div className="intro-copy">{children}</div>
      </div>
      {aside && <div className="intro-aside">{aside}</div>}
    </section>
  );
}
export function DemoLink({
  children = "Request a demo",
}: {
  children?: ReactNode;
}) {
  return (
    <Link className="site-button" href="/book-a-demo">
      {children}
      <span aria-hidden="true">↗</span>
    </Link>
  );
}
