import { describe, expect, it } from "vitest";
import { assertCanonicalPath, isValidProductionOrigin, normalizeOrigin } from "../validation";

describe("SEO validation", () => {
  it("normalizes a trailing slash", () => expect(normalizeOrigin("https://servora.test/")).toBe("https://servora.test"));
  it("accepts real HTTPS production origins", () => expect(isValidProductionOrigin("https://servora.app")).toBe(true));
  it("rejects placeholders and insecure URLs", () => {
    expect(isValidProductionOrigin("https://servora.example")).toBe(false);
    expect(isValidProductionOrigin("http://servora.app")).toBe(false);
  });
  it("requires canonical paths", () => {
    expect(assertCanonicalPath("/pricing")).toBe("/pricing");
    expect(() => assertCanonicalPath("pricing")).toThrow();
  });
});
