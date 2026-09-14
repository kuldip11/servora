import { createPageMetadata } from "@/lib/seo";
import { productSeoBySlug } from "@/content/seo";
import { ProductDetail } from "@/components/marketing/ProductDetail";
import { modules } from "@/content/modules";
const module = modules.find((item) => item.slug === "inventory")!;
const seo = productSeoBySlug["inventory"];
export const metadata = createPageMetadata({
  ...seo,
  path: "/product/inventory",
  ogTitle: seo.title,
  imageAlt: `${seo.title} — Servora`,
});
export default function Page() {
  return <ProductDetail module={module} />;
}
