const signal = new AbortController().signal;

import { describe, expect, it, vi } from "vitest";

const list = vi.hoisted(() => vi.fn());
vi.mock("../services/inventory.service", () => ({
  inventoryService: { list },
}));

vi.mock("../../../store/auth", () => ({
  useAuthStore: { getState: () => ({ franchiseId: "fr-1", branchId: "br-1" }) },
}));

import { inventoryItemsQuery } from "@/features/inventory/query-options";

describe("inventoryItemsQuery", () => {
  it("binds inventory items to the service and branch-scoped key", () => {
    const query = inventoryItemsQuery();
    expect(query.queryKey).toEqual([
      "inventory",
      "branch-context",
      "fr-1",
      "br-1",
      "items",
    ]);
    query.queryFn?.({ signal } as never);
    expect(list).toHaveBeenCalledWith({}, signal);
  });
});
