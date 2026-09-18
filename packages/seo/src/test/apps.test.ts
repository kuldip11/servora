import { describe, expect, it } from "vitest";
import { SERVORA_APPS } from "../apps";

describe("Servora SEO app policy", () => {
  it("only indexes the marketing website", () => {
    expect(Object.values(SERVORA_APPS).filter((app) => app.indexable).map((app) => app.id)).toEqual(["website"]);
  });

  it("provides complete social identity for every app", () => {
    for (const app of Object.values(SERVORA_APPS)) {
      expect(app.title.length).toBeGreaterThan(10);
      expect(app.description.length).toBeGreaterThan(20);
      expect(app.ogHeadline.length).toBeGreaterThan(10);
    }
  });
});
