import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unmock("@/config/env");
});
const load = async (nodeEnv: "development" | "production", cors: string) => {
  vi.resetModules();
  vi.doMock("@/config/env", () => ({
    env: { NODE_ENV: nodeEnv, CORS_ORIGIN: cors },
  }));
  return import("../auth-origin");
};

describe("auth origin policy", () => {
  it("accepts configured origins and development requests without origin", async () => {
    const { assertTrustedAuthOrigin } = await load(
      "development",
      " http://localhost:5173, https://app.example , ",
    );
    expect(() =>
      assertTrustedAuthOrigin("http://localhost:5173"),
    ).not.toThrow();
    expect(() => assertTrustedAuthOrigin("https://app.example")).not.toThrow();
    expect(() => assertTrustedAuthOrigin(undefined)).not.toThrow();
    expect(() => assertTrustedAuthOrigin("https://evil.example")).toThrow(
      "Request origin is not allowed",
    );
  });
  it("requires origins in production", async () => {
    const { assertTrustedAuthOrigin } = await load(
      "production",
      "https://app.example",
    );
    expect(() => assertTrustedAuthOrigin(undefined)).toThrow(
      "Trusted request origin is required",
    );
  });
  it("accepts every explicit origin when wildcard is configured", async () => {
    const { assertTrustedAuthOrigin } = await load("production", "*");
    expect(() =>
      assertTrustedAuthOrigin("https://anything.example"),
    ).not.toThrow();
  });
});
