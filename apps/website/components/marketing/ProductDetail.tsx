import Link from "next/link";
import type { Module } from "@/content/modules";
import { moduleBySlug } from "@/content/modules";
import { productGuidance } from "@/content/product-guidance";
import { presentation } from "@/content/presentation";
import { ProductSurface } from "@/components/site/ProductSurface";
import { DemoLink } from "@/components/site/Section";
import { CtaBanner } from "./CtaBanner";
import { getSiteUrl } from "@/lib/seo";
import {
  createBreadcrumbSchema,
  createOrganizationSchema,
  createFeaturePageSchema,
  serializeJsonLd,
} from "@pos/seo";
export function ProductDetail({ module }: { module: Module }) {
  const base = getSiteUrl();
  const path = `/product/${module.slug}`;
  const page = presentation[module.slug]!;
  const guidance = productGuidance[module.slug];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      createOrganizationSchema(base),
      createFeaturePageSchema(base, path, module.name, module.description),
      createBreadcrumbSchema(base, [
        { name: "Product", path: "/product" },
        { name: module.name, path },
      ]),
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <section className="feature-hero" data-layout={page.layout}>
        <div className="feature-heading">
          <Link href="/product">All product capabilities</Link>
          <h1>{page.title}</h1>
          <p>{module.description}</p>
          <DemoLink />
        </div>
        <div className="feature-preview">
          <ProductSurface kind={page.kind} />
        </div>
      </section>
      <section className="feature-body">
        <div>
          <h2>{page.question}</h2>
          <p>{guidance?.answer}</p>
          <ol>
            {module.workflow.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p>
            <strong>For {module.roles.join(", ").toLowerCase()}.</strong>
          </p>
        </div>
        <div className="feature-capabilities">
          {module.capabilities.map((capability, index) => (
            <article key={capability}>
              <h3>{capability}</h3>
              <p>{module.capabilityDescriptions[index]}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="service-board">
        <div className="service-board-copy">
          <h2>Make it your walkthrough.</h2>
          <p>{guidance?.demo}</p>
          <Link className="text-link" href="/book-a-demo">
            Book a demo
          </Link>
        </div>
        <ProductSurface
          kind={
            page.kind === "kitchen"
              ? "waiter"
              : page.kind === "customer"
                ? "kitchen"
                : "management"
          }
        />
      </section>
      <section className="related-links">
        <h2>Works together.</h2>
        <nav aria-label={`Related to ${module.name}`}>
          {module.related.map((slug) => {
            const related = moduleBySlug[slug];
            return related ? (
              <Link key={slug} href={`/product/${slug}`}>
                {related.name}
                <span aria-hidden="true">↗</span>
              </Link>
            ) : null;
          })}
        </nav>
      </section>
      <CtaBanner />
    </>
  );
}
