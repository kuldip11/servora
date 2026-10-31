import { describe, expect, it } from "vitest";
import { createPageMetadata, getAbsoluteUrl } from "@/lib/seo";

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
    expect(metadata.openGraph).toMatchObject({
      url: "/pricing",
      title: "A setup that fits your restaurant.",
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });

    expect(metadata.openGraph?.images).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: "/opengraph-image.png" }),
      ]),
    );
    expect(metadata.twitter?.images).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: "/twitter-image.png" }),
      ]),
    );
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

  it("builds stable absolute URLs for schema and canonical helpers", () => {
    expect(getAbsoluteUrl("/pricing")).toMatch(/^https?:\/\//);
  });
});
