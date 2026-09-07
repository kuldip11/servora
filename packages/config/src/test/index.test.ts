import { describe, expect, it } from "vitest";
import { assertHttpUrl, resolveAppUrls } from "../index";

describe("resolveAppUrls", () => {
  it("uses stable fallback paths when values are missing or blank", () => {
    expect(
      resolveAppUrls({
        WEB_APP_URL: "  ",
        KITCHEN_APP_URL: undefined,
        WAITER_APP_URL: "",
        CUSTOMER_APP_URL: "   ",
      }),
    ).toEqual({
      web: "/app",
      kitchen: "/kitchen",
      waiter: "/waiter",
      customer: "/order",
    });
  });

  it("trims configured application URLs", () => {
    expect(
      resolveAppUrls({
        WEB_APP_URL: " https://web.example.com ",
        KITCHEN_APP_URL: "https://kds.example.com",
        WAITER_APP_URL: " /staff/waiter ",
        CUSTOMER_APP_URL: "/guest",
      }),
    ).toEqual({
      web: "https://web.example.com",
      kitchen: "https://kds.example.com",
      waiter: "/staff/waiter",
      customer: "/guest",
    });
  });
});

describe("assertHttpUrl", () => {
  it.each(["http://localhost:5173", "https://servora.example.com/path"])(
    "accepts %s",
    (value) => expect(assertHttpUrl(value, "APP_URL")).toBe(value),
  );

  it("rejects non-http protocols", () => {
    expect(() => assertHttpUrl("ftp://example.com", "APP_URL")).toThrow(
      "APP_URL must use http or https",
    );
  });

  it("rejects malformed URLs", () => {
    expect(() => assertHttpUrl("not a url", "APP_URL")).toThrow();
  });
});
