import { describe, expect, it } from "vitest";
import { getIndexableWebsiteRoutes, WEBSITE_ROUTES } from "../routes";

describe("website route policy", () => {
  it("never places a noindex route in the sitemap", () => {
    expect(WEBSITE_ROUTES.filter((route) => !route.indexable && route.sitemap)).toEqual([]);
  });

  it("keeps login and placeholder legal routes out of the index", () => {
    const privatePaths = WEBSITE_ROUTES.filter((route) => !route.indexable).map((route) => route.path);
    expect(privatePaths).toEqual(expect.arrayContaining(["/login", "/legal/privacy", "/legal/terms", "/legal/cookies"]));
  });

  it("returns only indexable sitemap routes", () => {
    expect(getIndexableWebsiteRoutes().every((route) => route.indexable && route.sitemap)).toBe(true);
  });
});
