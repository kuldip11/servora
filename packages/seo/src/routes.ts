export type PublicRouteSeo = {
  path: `/${string}` | "/";
  indexable: boolean;
  sitemap: boolean;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  priority: number;
};

export const WEBSITE_ROUTES: readonly PublicRouteSeo[] = [
  { path: "/", indexable: true, sitemap: true, changeFrequency: "weekly", priority: 1 },
  { path: "/product", indexable: true, sitemap: true, changeFrequency: "monthly", priority: 0.8 },
  { path: "/apps", indexable: true, sitemap: true, changeFrequency: "monthly", priority: 0.7 },
  { path: "/pricing", indexable: true, sitemap: true, changeFrequency: "monthly", priority: 0.7 },
  { path: "/book-a-demo", indexable: true, sitemap: true, changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", indexable: true, sitemap: true, changeFrequency: "monthly", priority: 0.6 },
  { path: "/login", indexable: false, sitemap: false, changeFrequency: "yearly", priority: 0 },
  { path: "/legal/privacy", indexable: false, sitemap: false, changeFrequency: "yearly", priority: 0 },
  { path: "/legal/terms", indexable: false, sitemap: false, changeFrequency: "yearly", priority: 0 },
  { path: "/legal/cookies", indexable: false, sitemap: false, changeFrequency: "yearly", priority: 0 },
] as const;

export const getIndexableWebsiteRoutes = () => WEBSITE_ROUTES.filter((route) => route.indexable && route.sitemap);
