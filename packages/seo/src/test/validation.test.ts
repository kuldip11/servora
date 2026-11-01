import { describe, expect, it } from "vitest";
import {
  assertCanonicalPath,
  isValidProductionOrigin,
  normalizeOrigin,
} from "../validation";

describe("SEO validation", () => {
  it("normalizes a trailing slash", () =>
    expect(normalizeOrigin("https://servora.test/")).toBe(
      "https://servora.test",
    ));
  it("accepts real HTTPS production origins", () =>
    expect(isValidProductionOrigin("https://servora.app")).toBe(true));
  it("rejects placeholders and insecure URLs", () => {
    expect(isValidProductionOrigin("https://servora.example")).toBe(false);
    expect(isValidProductionOrigin("http://servora.app")).toBe(false);
  });
  it("requires canonical paths", () => {
    expect(assertCanonicalPath("/pricing")).toBe("/pricing");
    expect(() => assertCanonicalPath("pricing")).toThrow();
  });
});

it.each([
  "https://example.com",
  "https://sub.example.com",
  "https://user:pass@servora.app",
  "https://servora.app/path",
  "https://servora.app?q=1",
  "https://servora.app#frag",
  "https://localhost",
  "https://127.0.0.1",
])("rejects unsafe production origin %s", (url) => {
  expect(isValidProductionOrigin(url)).toBe(false);
});
it.each([
  "//external.test/path",
  "/\\external.test",
  "/pricing?x=1",
  "/pricing#x",
])("rejects noncanonical path %s", (path) => {
  expect(() => assertCanonicalPath(path)).toThrow();
});
