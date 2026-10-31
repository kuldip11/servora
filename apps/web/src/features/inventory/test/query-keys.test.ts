import { describe, expect, it, vi } from "vitest";

vi.mock("../../../store/auth", () => ({
  useAuthStore: { getState: () => ({ franchiseId: "fr-1", branchId: "br-1" }) },
}));

import { inventoryKeys } from "@/features/inventory/query-keys";

describe("inventoryKeys", () => {
  it("uses the inventory namespace and branch context", () => {
    expect(inventoryKeys.all).toEqual(["inventory"]);
    expect(inventoryKeys.items()).toEqual([
      "inventory",
      "branch-context",
      "fr-1",
      "br-1",
      "items",
    ]);
    expect(inventoryKeys.impact("i1")).toEqual([
      "inventory",
      "branch-context",
      "fr-1",
      "br-1",
      "impact",
      "i1",
    ]);
    expect(inventoryKeys.transactions()).toEqual([
      "inventory",
      "branch-context",
      "fr-1",
      "br-1",
      "transactions",
    ]);
    expect(inventoryKeys.wasteReasons()).toEqual([
      "inventory",
      "branch-context",
      "fr-1",
      "br-1",
      "waste-reasons",
    ]);
  });
});
