import { describe, expect, it } from "vitest";
import { resolveApiUrl } from "./client";

describe("resolveApiUrl", () => {
  it("uses a relative URL in development", () => {
    expect(resolveApiUrl(" https://api.example.test/ ", true)).toBe("");
  });

  it("trims and removes a trailing slash in production", () => {
    expect(resolveApiUrl(" https://api.example.test/ ", false)).toBe(
      "https://api.example.test",
    );
  });

  it("supports a missing production base URL", () => {
    expect(resolveApiUrl(undefined, false)).toBe("");
  });
});
