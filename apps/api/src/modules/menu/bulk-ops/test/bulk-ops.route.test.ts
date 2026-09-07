vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  class FakeElysia {
    routes: Array<{ method: string; path: string; handler: ((context: any) => unknown) | undefined }> = [];
    constructor(_options: unknown = {}) {}
    use(_plugin: unknown) { return this; }
    post(path: string, handler: ((context: any) => unknown) | undefined) {
      this.routes.push({ method: "POST", path, handler });
      return this;
    }
  }
  return { ...actual, Elysia: FakeElysia };
});

const {
  updateItemsStatus,
  updateItemsCategory,
  bulkSetItemTags,
  bulkSetItemModifierGroups,
  bulkUpdatePrice,
  bulkDeleteItems,
} = vi.hoisted(() => ({
  updateItemsStatus: vi.fn(),
  updateItemsCategory: vi.fn(),
  bulkSetItemTags: vi.fn(),
  bulkSetItemModifierGroups: vi.fn(),
  bulkUpdatePrice: vi.fn(),
  bulkDeleteItems: vi.fn(),
}));

vi.mock("@/core/auth", () => ({ requireAuthPlugin: () => ({}) }));
vi.mock("../bulk-ops.controller", () => ({
  bulkOpsController: {
    updateItemsStatus,
    updateItemsCategory,
    bulkSetItemTags,
    bulkSetItemModifierGroups,
    bulkUpdatePrice,
    bulkDeleteItems,
  },
}));

import { describe, expect, it, vi } from "vitest";
import { menuBulkOpsRouter } from "../bulk-ops.route";

describe("bulk-ops.route routes", () => {
  it("registers every bulk endpoint and forwards request payloads", async () => {
    const auth = { tenantId: "t1" };
    const routes = (menuBulkOpsRouter as any).routes as Array<{
      method: string;
      path: string;
      handler: ((context: any) => unknown) | undefined;
    }>;
    expect(routes.map(({ method, path }) => ({ method, path }))).toEqual([
      { method: "POST", path: "/status" },
      { method: "POST", path: "/category" },
      { method: "POST", path: "/tags" },
      { method: "POST", path: "/modifiers" },
      { method: "POST", path: "/price" },
      { method: "POST", path: "/delete" },
    ]);

    const route = (path: string) => routes.find((candidate) => candidate.path === path)!;
    updateItemsStatus.mockResolvedValueOnce({ ok: true });
    updateItemsCategory.mockResolvedValueOnce({ ok: true });
    bulkSetItemTags.mockResolvedValueOnce({ ok: true });
    bulkSetItemModifierGroups.mockResolvedValueOnce({ ok: true });
    bulkUpdatePrice.mockResolvedValueOnce({ ok: true });
    bulkDeleteItems.mockResolvedValueOnce({ ok: true });

    await route("/status").handler!({ auth, body: { itemIds: ["i1"], status: "ACTIVE", reason: "Back" } });
    await route("/category").handler!({ auth, body: { itemIds: ["i1"], categoryId: "c1" } });
    await route("/tags").handler!({ auth, body: { itemIds: ["i1"], tagIds: ["t1"], mode: "REPLACE" } });
    await route("/modifiers").handler!({ auth, body: { itemIds: ["i1"], modifierGroupIds: ["m1"], mode: "ADD" } });
    await route("/price").handler!({ auth, body: { itemIds: ["i1"], priceChange: 10, mode: "PERCENTAGE" } });
    await route("/delete").handler!({ auth, body: { itemIds: ["i1"] } });

    expect(updateItemsStatus).toHaveBeenCalledWith(auth, ["i1"], "ACTIVE", "Back");
    expect(updateItemsCategory).toHaveBeenCalledWith(auth, ["i1"], "c1");
    expect(bulkSetItemTags).toHaveBeenCalledWith(auth, ["i1"], ["t1"], "REPLACE");
    expect(bulkSetItemModifierGroups).toHaveBeenCalledWith(auth, ["i1"], ["m1"], "ADD");
    expect(bulkUpdatePrice).toHaveBeenCalledWith(auth, ["i1"], 10, "PERCENTAGE");
    expect(bulkDeleteItems).toHaveBeenCalledWith(auth, ["i1"]);
  });
});
