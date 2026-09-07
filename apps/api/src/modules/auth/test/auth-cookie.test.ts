import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unmock("@/config/env");
});

const load = async (nodeEnv: "development" | "production") => {
  vi.resetModules();
  vi.doMock("@/config/env", () => ({ env: { NODE_ENV: nodeEnv } }));
  return import("../auth-cookie");
};

describe("refresh cookie", () => {
  it("serializes, reads, isolates and clears cookies in development", async () => {
    const {
      REFRESH_COOKIE_NAME,
      serializeRefreshCookie,
      readRefreshCookie,
      clearRefreshCookie,
    } = await load("development");
    const web = serializeRefreshCookie("token value");
    expect(web).toContain(`${REFRESH_COOKIE_NAME}=token%20value`);
    expect(web).toContain("Path=/api/auth");
    expect(web).toContain("HttpOnly");
    expect(web).toContain("SameSite=Lax");
    expect(web).not.toContain("Secure");
    expect(readRefreshCookie(undefined)).toBeNull();
    expect(
      readRefreshCookie("other=x; servora_refresh_web=abc%20123; foo=y"),
    ).toBe("abc 123");
    expect(readRefreshCookie("servora_refresh_web=")).toBeNull();
    expect(readRefreshCookie("other=x")).toBeNull();
    expect(readRefreshCookie("servora_refresh_web=a%3Db")).toBe("a=b");
    expect(serializeRefreshCookie("chef", "kitchen")).toContain(
      "servora_refresh_kitchen=chef",
    );
    expect(
      readRefreshCookie(
        "servora_refresh_web=owner; servora_refresh_kitchen=chef",
        "kitchen",
      ),
    ).toBe("chef");
    const cleared = clearRefreshCookie("waiter");
    expect(cleared).toContain("servora_refresh_waiter=");
    expect(cleared).toContain("Max-Age=0");
    expect(cleared).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  });

  it("uses secure cross-site cookie attributes in production", async () => {
    const { serializeRefreshCookie, clearRefreshCookie } =
      await load("production");
    expect(serializeRefreshCookie("x")).toContain("Secure");
    expect(serializeRefreshCookie("x")).toContain("SameSite=None");
    expect(clearRefreshCookie()).toContain("Secure");
  });
});
