import { describe, expect, it } from "vitest";
import {
  matchesGlobalSearch,
  normalizeSearchText,
} from "@/features/global-command/utils";

describe("global command search utilities", () => {
  it("normalizes whitespace and casing", () => {
    expect(normalizeSearchText("  LaTTe  ")).toBe("latte");
  });

  it("matches across labels and keywords", () => {
    expect(
      matchesGlobalSearch("stock", ["Inventory", "Low stock alerts"]),
    ).toBe(true);
    expect(
      matchesGlobalSearch("pasta", ["Inventory", "Low stock alerts"]),
    ).toBe(false);
  });

  it("treats an empty query as a match", () => {
    expect(matchesGlobalSearch("", ["Orders"])).toBe(true);
  });
});
