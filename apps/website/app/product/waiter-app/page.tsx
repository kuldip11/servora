import { createPageMetadata } from "@/lib/seo";
import { productSeoBySlug } from "@/content/seo";
import { ProductDetail } from "@/components/marketing/ProductDetail";
import { moduleBySlug } from "@/content/modules";
export const metadata = createPageMetadata({
  ...productSeoBySlug["waiter-app"]!,
  path: "/product/waiter-app",
});
export default function Page() {
  return <ProductDetail module={moduleBySlug["waiter-app"]!} />;
}
