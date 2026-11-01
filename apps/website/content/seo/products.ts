import { products } from "../product";
export type ProductSeo = {
  title: string;
  description: string;
  searchIntent: readonly string[];
};
const titles: Record<string, string> = {
  "pos-and-orders": "Restaurant POS and order management",
  "kitchen-display": "Restaurant kitchen display system",
  "waiter-app": "Restaurant waiter ordering app",
  "qr-ordering": "Restaurant QR ordering system",
  "menu-management": "Restaurant menu management software",
  "billing-and-payments": "Restaurant billing and bill splitting",
  inventory: "Restaurant inventory and recipe management",
  "staff-and-roles": "Restaurant staff roles and permissions",
  analytics: "Restaurant reports and analytics",
  "multi-branch": "Multi-branch restaurant management",
  security: "Restaurant access controls and permissions",
};
export const productSeoBySlug: Record<string, ProductSeo> = Object.fromEntries(
  products.map((p) => [
    p.slug,
    {
      title: titles[p.slug]!,
      description: p.intro,
      searchIntent: [titles[p.slug]!.toLowerCase()],
    },
  ]),
);
