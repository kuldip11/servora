import Link from "next/link";
export default function NotFound() {
  return (
    <section className="container recovery-page">
      <h1>This table isn't here.</h1>
      <p>The page may have moved, or the link may be incomplete.</p>
      <Link className="action" href="/product">
        Explore the product
      </Link>
    </section>
  );
}
