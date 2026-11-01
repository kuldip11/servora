import Link from "next/link";
import type { Module } from "@/content/modules";
import { findProduct } from "@/content/product";
import { ProductFigure } from "@/components/site/ProductFigure";
import { Action, ClosingCta } from "@/components/site/Primitives";
import { getSiteUrl } from "@/lib/seo";
import {
  createBreadcrumbSchema,
  createOrganizationSchema,
  createFeaturePageSchema,
  serializeJsonLd,
} from "@pos/seo";
export function ProductDetail({ module }: { module: Module }) {
  const p = findProduct(module.slug);
  const path = `/product/${p.slug}`;
  const base = getSiteUrl();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@graph": [
              createOrganizationSchema(base),
              createFeaturePageSchema(base, path, p.name, p.intro),
              createBreadcrumbSchema(base, [
                { name: "Product", path: "/product" },
                { name: p.name, path },
              ]),
            ],
          }),
        }}
      />
      <section className={`product-hero container product-layout-${p.layout}`}>
        <div>
          <Link className="text-link" href="/product">
            ← All products
          </Link>
          <h1>{p.title}</h1>
          <p className="lead">{p.intro}</p>
          <Action />
          <p className="small-copy">{p.audience}</p>
        </div>
        {p.capture ? (
          <ProductFigure kind={p.capture} priority />
        ) : (
          <div className="workflow-outline">
            <h2>{p.name}</h2>
            <ul>
              {p.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <section className="container product-explanation">
        <div>
          <h2>{p.question}</h2>
          <p className="lead">{p.answer}</p>
        </div>
        <div className="product-features">
          {p.features.map((feature) => (
            <article key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>
      {p.capture ? (
        <section className="container product-sequence">
          <h2>How the work moves.</h2>
          <ol>
            {p.steps.map((step) => (
              <li key={step}>
                <span className="sequence-dot" />
                {step}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {p.boundary ? (
        <aside className="container availability-note">
          <h2>For your setup.</h2>
          <p>{p.boundary}</p>
        </aside>
      ) : null}
      <section className="container related-products">
        <h2>The next handoff.</h2>
        <div>
          {p.related.map((slug) => {
            const related = findProduct(slug);
            return (
              <Link key={slug} href={`/product/${slug}`}>
                <h3>{related.name}</h3>
                <p>{related.intro}</p>
                <span aria-hidden="true">↗</span>
              </Link>
            );
          })}
        </div>
      </section>
      <ClosingCta />
    </>
  );
}
