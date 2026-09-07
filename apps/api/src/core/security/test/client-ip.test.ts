import { describe, expect, it } from "vitest";
import { resolveClientIp } from "@/core/security/client-ip";

describe("resolveClientIp", () => {
  it("uses the direct address when no proxy hops are trusted", () => {
    expect(
      resolveClientIp(
        {
          "x-forwarded-for": "203.0.113.1",
          "x-real-ip": "203.0.113.2",
        },
        "10.0.0.1",
        0,
      ),
    ).toBe("10.0.0.1");
  });

  it("selects the client address based on trusted proxy hops", () => {
    const headers = {
      "x-forwarded-for": " 198.51.100.1, , 10.0.0.2, 10.0.0.3 ",
    };
    expect(resolveClientIp(headers, "10.0.0.4", 1)).toBe("10.0.0.3");
    expect(resolveClientIp(headers, "10.0.0.4", 2)).toBe("10.0.0.2");
    expect(resolveClientIp(headers, "10.0.0.4", 99)).toBe("198.51.100.1");
  });

  it("falls back through x-real-ip and the direct address", () => {
    expect(
      resolveClientIp({ "x-real-ip": " 203.0.113.9 " }, "10.0.0.1", 1),
    ).toBe("203.0.113.9");
    expect(resolveClientIp({}, "10.0.0.1", 1)).toBe("10.0.0.1");
    expect(resolveClientIp({}, undefined, 1)).toBeUndefined();
  });
});
