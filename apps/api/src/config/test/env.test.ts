import { describe, expect, it } from "vitest";
import { loadApiEnv } from "@/config/env";

const baseEnv = (): NodeJS.ProcessEnv => ({
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  JWT_SECRET: "1234567890abcdef",
  METRICS_TOKEN: "1234567890abcdef",
});

describe("loadApiEnv", () => {
  it("applies defaults and coerces numeric settings", () => {
    const value = loadApiEnv({
      ...baseEnv(),
      PORT: "4321",
      RATE_LIMIT_MAX: "42",
      RATE_LIMIT_WINDOW_SECONDS: "15",
      TRUST_PROXY_HOPS: "2",
    });

    expect(value).toMatchObject({
      NODE_ENV: "test",
      PORT: 4321,
      APP_VERSION: "development",
      RATE_LIMIT_MAX: 42,
      RATE_LIMIT_WINDOW_SECONDS: 15,
      TRUST_PROXY_HOPS: 2,
      JWT_EXPIRES_IN: "15m",
    });
  });

  it("reports all validation issues with their field paths", () => {
    expect(() =>
      loadApiEnv({
        ...baseEnv(),
        PORT: "0",
        TRUST_PROXY_HOPS: "99",
        JWT_SECRET: "short",
      }),
    ).toThrow(/Invalid API environment: .*PORT:.*TRUST_PROXY_HOPS:.*JWT_SECRET:/);
  });

  it("requires strong production JWT and metrics secrets", () => {
    expect(() =>
      loadApiEnv({
        ...baseEnv(),
        NODE_ENV: "production",
        CORS_ORIGIN: "https://pos.example.com",
      }),
    ).toThrow(
      "Invalid API environment: production JWT/metrics secrets must be at least 32 characters",
    );
  });

  it("rejects wildcard production CORS", () => {
    expect(() =>
      loadApiEnv({
        ...baseEnv(),
        NODE_ENV: "production",
        JWT_SECRET: "j".repeat(32),
        METRICS_TOKEN: "m".repeat(32),
        CORS_ORIGIN: " https://pos.example.com, * ,",
      }),
    ).toThrow("Invalid API environment: wildcard CORS is forbidden in production");
  });

  it.each([
    "http://pos.example.com",
    "https://localhost:5173",
    "https://127.0.0.1:5173",
  ])("rejects non-public HTTPS production origin %s", (origin) => {
    expect(() =>
      loadApiEnv({
        ...baseEnv(),
        NODE_ENV: "production",
        JWT_SECRET: "j".repeat(32),
        METRICS_TOKEN: "m".repeat(32),
        CORS_ORIGIN: origin,
      }),
    ).toThrow(
      `Invalid API environment: production CORS origin must be a public HTTPS URL (${origin})`,
    );
  });

  it("accepts multiple trimmed public HTTPS production origins", () => {
    const value = loadApiEnv({
      ...baseEnv(),
      NODE_ENV: "production",
      JWT_SECRET: "j".repeat(32),
      METRICS_TOKEN: "m".repeat(32),
      CORS_ORIGIN: " https://pos.example.com,https://kitchen.example.com ",
    });
    expect(value.NODE_ENV).toBe("production");
    expect(value.CORS_ORIGIN).toContain("https://pos.example.com");
  });
});
