import type { MetadataRoute } from "next";
import { modules } from "@/content/modules";
import { getSiteUrl } from "@/lib/seo";
import { getIndexableWebsiteRoutes } from "@pos/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const staticRoutes = getIndexableWebsiteRoutes().map((route) => ({
    url: `${base}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
  const productRoutes = modules.map((module) => ({
    url: `${base}/product/${module.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));
  return [...staticRoutes, ...productRoutes];
}
