import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Elysia } from "elysia";

const state = vi.hoisted(() => ({
  env: {
    NODE_ENV: "test" as "test" | "production",
    TRUST_PROXY_HOPS: 0,
    RATE_LIMIT_WINDOW_SECONDS: 60,
    RATE_LIMIT_MAX: 3,
  },
  incr: vi.fn(),
  expire: vi.fn(),
}));

vi.mock("@/config/env", () => ({ env: state.env }));
vi.mock("@/lib/redis", () => ({
  redis: {
    incr: state.incr,
    expire: state.expire,
  },
}));

import {
  rateLimitPlugin,
  securityHeadersPlugin,
} from "@/core/security/security";

describe("security middleware", () => {
  beforeEach(() => {
    state.env.NODE_ENV = "test";
    state.env.TRUST_PROXY_HOPS = 0;
    state.env.RATE_LIMIT_WINDOW_SECONDS = 60;
    state.env.RATE_LIMIT_MAX = 3;
    state.incr.mockReset().mockResolvedValue(1);
    state.expire.mockReset().mockResolvedValue(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds API security headers without HSTS outside production", async () => {
    const app = new Elysia().use(securityHeadersPlugin()).get("/", () => "ok");
    const response = await app.handle(new Request("http://localhost/"));

    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("permissions-policy")).toContain("camera=()");
    expect(response.headers.get("cross-origin-opener-policy")).toBe("same-origin");
    expect(response.headers.get("cross-origin-resource-policy")).toBe("same-site");
    expect(response.headers.get("content-security-policy")).toContain(
      "default-src 'none'",
    );
    expect(response.headers.get("strict-transport-security")).toBeNull();
  });

  it("adds HSTS in production", async () => {
    state.env.NODE_ENV = "production";
    const app = new Elysia().use(securityHeadersPlugin()).get("/", () => "ok");
    const response = await app.handle(new Request("https://example.com/"));
    expect(response.headers.get("strict-transport-security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
  });

  it.each(["/health", "/health/live", "/swagger", "/swagger/json", "/ws", "/ws/orders"])(
    "exempts %s from global rate limiting",
    async (path) => {
      const app = new Elysia().use(rateLimitPlugin()).get(path, () => "ok");
      const response = await app.handle(new Request(`http://localhost${path}`));
      expect(response.status).toBe(200);
      expect(state.incr).not.toHaveBeenCalled();
    },
  );

  it("increments a bucket, sets expiry on first hit, and returns remaining quota", async () => {
    vi.spyOn(Date, "now").mockReturnValue(120_000);
    state.incr.mockResolvedValueOnce(1);

    const app = new Elysia().use(rateLimitPlugin()).get("/orders", () => "ok");
    const response = await app.handle(new Request("http://localhost/orders"));

    expect(state.incr).toHaveBeenCalledWith("servora:rate-limit:unknown:2");
    expect(state.expire).toHaveBeenCalledWith(
      "servora:rate-limit:unknown:2",
      61,
    );
    expect(response.headers.get("x-ratelimit-limit")).toBe("3");
    expect(response.headers.get("x-ratelimit-remaining")).toBe("2");
    expect(response.status).toBe(200);
  });

  it("does not refresh expiry after the first request in a bucket", async () => {
    state.incr.mockResolvedValueOnce(2);
    const app = new Elysia().use(rateLimitPlugin()).get("/orders", () => "ok");
    const response = await app.handle(new Request("http://localhost/orders"));
    expect(response.status).toBe(200);
    expect(state.expire).not.toHaveBeenCalled();
    expect(response.headers.get("x-ratelimit-remaining")).toBe("1");
  });

  it("returns 429 with retry metadata when the quota is exceeded", async () => {
    state.incr.mockResolvedValueOnce(4);
    const app = new Elysia().use(rateLimitPlugin()).get("/orders", () => "ok");
    const response = await app.handle(new Request("http://localhost/orders"));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(response.headers.get("x-ratelimit-remaining")).toBe("0");
    expect(await response.json()).toEqual({
      success: false,
      code: "RATE_LIMITED",
      message: "Too many requests",
    });
  });

  it("fails open when Redis is unavailable", async () => {
    state.incr.mockRejectedValueOnce(new Error("redis down"));
    const app = new Elysia().use(rateLimitPlugin()).get("/orders", () => "ok");
    const response = await app.handle(new Request("http://localhost/orders"));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });
});
