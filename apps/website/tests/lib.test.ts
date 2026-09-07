import { afterEach, describe, expect, it, vi } from "vitest";
import { modules, moduleBySlug } from "@/content/modules";
import { track } from "@/lib/analytics";

describe("website content registry", () => {
  it("keeps module slugs unique and the lookup table in sync", () => {
    const slugs = modules.map((module) => module.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const module of modules) {
      expect(moduleBySlug[module.slug]).toBe(module);
      expect(module.capabilities.length).toBeGreaterThan(0);
      expect(module.workflow.length).toBeGreaterThan(0);
      expect(module.roles.length).toBeGreaterThan(0);
    }
  });

  it("only references related modules that exist", () => {
    for (const module of modules) {
      for (const related of module.related) {
        expect(
          moduleBySlug[related],
          `${module.slug} -> ${related}`,
        ).toBeDefined();
      }
    }
  });
});

describe("analytics tracking", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is a no-op during server rendering", () => {
    const original = globalThis.window;
    vi.stubGlobal("window", undefined);
    expect(() => track({ event: "page_view", path: "/" })).not.toThrow();
    vi.stubGlobal("window", original);
  });

  it("always dispatches the internal event but only calls gtag after consent", () => {
    const dispatchEvent = vi.fn();
    const getItem = vi.fn().mockReturnValue("rejected");
    const gtag = vi.fn();
    vi.stubGlobal("window", {
      dispatchEvent,
      localStorage: { getItem },
      gtag,
    });
    vi.stubGlobal(
      "CustomEvent",
      class CustomEvent {
        constructor(
          public type: string,
          public init: { detail: unknown },
        ) {}
      },
    );

    track({ event: "pricing_cta_click", plan_name: "Pro" });
    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(gtag).not.toHaveBeenCalled();

    getItem.mockReturnValue("accepted");
    track({ event: "contact_form_submit", subject: "sales" });
    expect(gtag).toHaveBeenCalledWith("event", "contact_form_submit", {
      event: undefined,
      subject: "sales",
    });
  });
});

describe("website application URLs", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses public environment URLs when provided", async () => {
    vi.stubEnv("NEXT_PUBLIC_WEB_APP_URL", " https://web.example.com ");
    vi.stubEnv("NEXT_PUBLIC_KITCHEN_APP_URL", "https://kds.example.com");
    vi.stubEnv("NEXT_PUBLIC_WAITER_APP_URL", "https://waiter.example.com");
    vi.stubEnv("NEXT_PUBLIC_CUSTOMER_APP_URL", "https://guest.example.com");
    const { appUrls } = await import("@/lib/app-urls");
    expect(appUrls).toEqual({
      web: "https://web.example.com",
      kitchen: "https://kds.example.com",
      waiter: "https://waiter.example.com",
      customer: "https://guest.example.com",
    });
  });

  it("builds one link per Servora application", async () => {
    const { servoraApps } = await import("@/lib/servora-apps");
    expect(servoraApps.map((app) => app.key)).toEqual([
      "web",
      "kitchen",
      "waiter",
      "customer",
    ]);
    expect(servoraApps.every((app) => app.href.length > 0)).toBe(true);
  });
});
