import { createPageMetadata } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";
import { modules } from "@/content/modules";
import { ModuleCard } from "@/components/marketing/ModuleCard";
import { CtaBanner } from "@/components/marketing/CtaBanner";
export const metadata = createPageMetadata(websitePageSeo.product);
export default function ProductPage() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <p className="text-sm font-semibold text-[var(--primary)]">Product</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Restaurant operations, connected from customer to kitchen to back
          office.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
          Explore the capabilities currently represented in the Servora
          application.
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <ModuleCard key={m.slug} module={m} />
          ))}
        </div>
      </section>
      <CtaBanner />
    </>
  );
}
