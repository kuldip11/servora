import Link from "next/link";
import { ArrowRight, CheckCircle2, Users, Workflow } from "lucide-react";
import type { Module } from "@/content/modules";
import { moduleBySlug } from "@/content/modules";
import { CtaBanner } from "./CtaBanner";
import { ProductPreview } from "./ProductPreview";
import { getSiteUrl } from "@/lib/seo";
import {
  createBreadcrumbSchema,
  createOrganizationSchema,
  createSoftwareApplicationSchema,
} from "@pos/seo";

export const ProductDetail = ({ module }: { module: Module }) => {
  const base = getSiteUrl();
  const path = `/product/${module.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      createOrganizationSchema(base),
      createSoftwareApplicationSchema({
        baseUrl: base,
        name: `Servora ${module.name}`,
        path,
        description: module.description,
      }),
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto max-w-7xl px-6 pb-20 pt-14 lg:px-8 lg:pt-20">
        <nav
          aria-label="Breadcrumb"
          className="mb-4 text-sm text-[var(--text-secondary)]"
        >
          <Link
            href="/product"
            className="text-[var(--primary)] hover:underline"
          >
            Product
          </Link>
          <span aria-hidden="true"> / </span>
          <span>{module.name}</span>
        </nav>
        <Link
          href="/product"
          className="inline-flex text-sm font-medium text-[var(--primary)] hover:underline"
        >
          ← All product capabilities
        </Link>

        <div className="mt-10 grid items-center gap-12 lg:grid-cols-[1fr_0.9fr]">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
              {module.eyebrow}
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {module.name}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
              {module.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/book-a-demo"
                className="inline-flex items-center rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[var(--primary-hover)]"
              >
                See it in a demo <ArrowRight className="ml-2" size={16} />
              </Link>
              <Link
                href="/product"
                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold hover:bg-[var(--surface-secondary)]"
              >
                Explore all capabilities
              </Link>
            </div>
          </div>
          <ProductPreview label={module.name} />
        </div>

        <div className="mt-20 grid gap-5 md:grid-cols-3">
          {module.capabilities.map((capability, index) => (
            <article
              key={capability}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
            >
              <CheckCircle2
                className="text-[var(--primary)]"
                size={22}
                aria-hidden="true"
              />
              <h2 className="mt-5 text-lg font-semibold">{capability}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {module.capabilityDescriptions[index]}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-20 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface-secondary)] p-8 sm:p-10">
            <div className="flex items-center gap-3">
              <Workflow
                className="text-[var(--primary)]"
                size={22}
                aria-hidden="true"
              />
              <h2 className="text-xl font-semibold">
                How it fits the workflow
              </h2>
            </div>
            <ol className="mt-7 space-y-5">
              {module.workflow.map((step, index) => (
                <li key={step} className="flex gap-4">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-sm font-semibold text-[var(--primary)]">
                    {index + 1}
                  </span>
                  <span className="pt-1 text-sm leading-6 text-[var(--text-secondary)]">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 sm:p-10">
            <div className="flex items-center gap-3">
              <Users
                className="text-[var(--primary)]"
                size={22}
                aria-hidden="true"
              />
              <h2 className="text-xl font-semibold">Useful for</h2>
            </div>
            <div className="mt-7 flex flex-wrap gap-2">
              {module.roles.map((role) => (
                <span
                  key={role}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-secondary)]"
                >
                  {role}
                </span>
              ))}
            </div>
            <p className="mt-7 text-sm leading-6 text-[var(--text-secondary)]">
              {module.name} stays connected to ordering, kitchen and business
              context so teams can work from the same operational record instead
              of isolated tools.
            </p>
          </section>
        </div>

        {module.related.length > 0 && (
          <section className="mt-20">
            <h2 className="text-2xl font-semibold tracking-tight">
              Works with
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {module.related.map((slug) => {
                const related = moduleBySlug[slug];
                if (!related) return null;
                return (
                  <Link
                    key={slug}
                    href={`/product/${slug}`}
                    className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <p className="text-sm font-semibold">{related.name}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {related.description}
                    </p>
                    <span className="mt-4 inline-flex items-center text-sm font-semibold text-[var(--primary)]">
                      Explore <ArrowRight className="ml-1" size={15} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </section>
      <CtaBanner title={`Explore ${module.name} with your team.`} />
    </>
  );
};
