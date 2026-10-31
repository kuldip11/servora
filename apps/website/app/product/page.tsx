import { createPageMetadata } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";
import { modules } from "@/content/modules";
import { ModuleCard } from "@/components/marketing/ModuleCard";
import { CtaBanner } from "@/components/marketing/CtaBanner";
import { PageIntro, DemoLink } from "@/components/site/Section";
import { ProductSurface } from "@/components/site/ProductSurface";
export const metadata = createPageMetadata(websitePageSeo.product);
export default function ProductPage() {
  return (
    <>
      <PageIntro
        title="Built around service."
        aside={<ProductSurface kind="management" />}
      >
        <p>
          Orders, menus, kitchens, bills and branch operations. Explore the
          connected tools your restaurant team works with.
        </p>
        <DemoLink />
      </PageIntro>
      <section className="product-index" aria-label="Product capabilities">
        {modules.map((module) => (
          <ModuleCard key={module.slug} module={module} />
        ))}
      </section>
      <CtaBanner />
    </>
  );
}
