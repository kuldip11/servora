import { describe, expect, it } from "vitest";
import {
  BRAND_ASSETS,
  createPageMetadata,
  getAbsoluteUrl,
  getOgImageUrl,
} from "@/lib/seo";

describe("website SEO adapter", () => {
  it("creates canonical, Open Graph and Twitter metadata for indexable pages", () => {
    const metadata = createPageMetadata({
      title: "Pricing",
      description: "Servora restaurant pricing.",
      path: "/pricing",
      ogTitle: "A setup that fits your restaurant.",
    });
    expect(metadata.alternates).toEqual({ canonical: "/pricing" });
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(metadata.openGraph).toMatchObject({ url: "/pricing" });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
    expect(JSON.stringify(metadata)).toContain(
      getAbsoluteUrl(BRAND_ASSETS.websiteOg),
    );
    expect(JSON.stringify(metadata)).not.toContain("/og?");
  });

  it("keeps utility pages noindex and out of canonical metadata", () => {
    const metadata = createPageMetadata({
      title: "Sign in",
      description: "Sign in.",
      path: "/login",
      index: false,
    });
    expect(metadata.alternates).toBeUndefined();
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });

  it("keeps dynamic OG generation available only when explicitly requested", () => {
    const metadata = createPageMetadata({
      title: "Kitchen Display",
      description: "Kitchen display.",
      path: "/product/kitchen-display",
      staticImage: false,
    });

    expect(JSON.stringify(metadata)).toContain("/og?");
  });

  it("builds stable social and absolute URLs", () => {
    expect(getOgImageUrl({ title: "Kitchen Display", eyebrow: "Kitchen" })).toContain("/og?");
    expect(getAbsoluteUrl("/pricing")).toMatch(/^https?:\/\//);
  });
});
