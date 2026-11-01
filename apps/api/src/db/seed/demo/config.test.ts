import { describe, expect, it } from "vitest";
import {
  estimateSeedSizeMb,
  resolvePreset,
  SMALL_PRESET_MAX_MB,
} from "./config";
import {
  parsePreset,
  parseReferenceTime,
  seededNumber,
  uuidFor,
  assertDemoEnvironment,
} from "./utils";

describe("demo seed presets", () => {
  it("supports exactly the documented small and demo presets", () => {
    expect(parsePreset(["--preset=small"])).toBe("small");
    expect(parsePreset(["--preset=demo"])).toBe("demo");
    expect(() => parsePreset(["--preset=stress"])).toThrow(
      "Expected small or demo",
    );
  });

  it("keeps small below its 250 MB conservative budget", () => {
    const config = resolvePreset("small");
    expect(config.brands).toHaveLength(4);
    expect(config.brands.every((brand) => brand.branchCount === 2)).toBe(true);
    expect(config.estimatedSizeMb).toBe(estimateSeedSizeMb(config));
    expect(config.estimatedSizeMb).toBeLessThanOrEqual(SMALL_PRESET_MAX_MB);
  });

  it("makes demo substantially larger while retaining all concepts", () => {
    const small = resolvePreset("small");
    const demo = resolvePreset("demo");
    expect(demo.brands).toHaveLength(4);
    expect(demo.brands.every((brand) => brand.branchCount === 3)).toBe(true);
    expect(demo.historyDays).toBe(90);
    expect(demo.estimatedSizeMb).toBeGreaterThan(small.estimatedSizeMb * 8);
  });
});

describe("demo controls", () => {
  it("handles root script separators, split arguments and a safe small default", () => {
    expect(parsePreset([])).toBe("small");
    expect(parsePreset(["--", "--preset=small"])).toBe("small");
    expect(parsePreset(["--preset", "demo"])).toBe("demo");
    expect(() => parsePreset(["--presett=demo"])).toThrow(
      "Unknown demo argument",
    );
  });
  it("validates an explicitly zoned reference clock", () => {
    expect(
      parseReferenceTime(["--as-of=2026-11-01T10:30:00+05:30"]).toISOString(),
    ).toBe("2026-11-01T05:00:00.000Z");
    expect(() => parseReferenceTime(["--as-of=2026-11-01"])).toThrow();
  });
  it("has repeatable UUIDs and half-open random values", () => {
    expect(uuidFor("table:1")).toBe(uuidFor("table:1"));
    expect(uuidFor("table:1")).not.toBe(uuidFor("table:2"));
    for (let i = 0; i < 1000; i++) {
      expect(seededNumber(String(i))).toBeGreaterThanOrEqual(0);
      expect(seededNumber(String(i))).toBeLessThan(1);
    }
  });
  it("rejects production before mutation", () => {
    const original = process.env["NODE_ENV"];
    process.env["NODE_ENV"] = "production";
    try {
      expect(() => assertDemoEnvironment()).toThrow("disabled in production");
    } finally {
      if (original === undefined) delete process.env["NODE_ENV"];
      else process.env["NODE_ENV"] = original;
    }
  });
});
