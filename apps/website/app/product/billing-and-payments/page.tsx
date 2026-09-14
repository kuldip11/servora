import { createPageMetadata } from "@/lib/seo";
import { productSeoBySlug } from "@/content/seo";
import { ProductDetail } from "@/components/marketing/ProductDetail";
import { modules } from "@/content/modules";
const module = modules.find((item) => item.slug === "billing-and-payments")!;
const seo = productSeoBySlug["billing-and-payments"];
export const metadata = createPageMetadata({
  ...seo,
  path: "/product/billing-and-payments",
  ogTitle: seo.title,
  imageAlt: `${seo.title} — Servora`,
});
export default function Page() {
  return <ProductDetail module={module} />;
}
