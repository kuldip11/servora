import { createPageMetadata } from "@/lib/seo";
import { productSeoBySlug } from "@/content/seo";
import { ProductDetail } from "@/components/marketing/ProductDetail";
import { modules } from "@/content/modules";
const module = modules.find((item) => item.slug === "staff-and-roles")!;
const seo = productSeoBySlug["staff-and-roles"];
export const metadata = createPageMetadata({
  ...seo,
  path: "/product/staff-and-roles",
  ogTitle: seo.title,
  imageAlt: `${seo.title} — Servora`,
});
export default function Page() {
  return <ProductDetail module={module} />;
}
