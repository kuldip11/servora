import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "@/core/auth";

const m = vi.hoisted(() => ({
  findItemScopes: vi.fn(),
  updateItemsStatus: vi.fn(),
  updateItemsCategory: vi.fn(),
  bulkSetItemTags: vi.fn(),
  bulkSetItemModifierGroups: vi.fn(),
  bulkUpdatePrice: vi.fn(),
  bulkDeleteItems: vi.fn(),
  recordMany: vi.fn(),
  requirePermission: vi.fn(),
  assertMenuResourceBranch: vi.fn(),
}));

vi.mock("../bulk-ops.repository", () => ({
  bulkOpsRepository: {
    findItemScopes: m.findItemScopes,
    updateItemsStatus: m.updateItemsStatus,
    updateItemsCategory: m.updateItemsCategory,
    bulkSetItemTags: m.bulkSetItemTags,
    bulkSetItemModifierGroups: m.bulkSetItemModifierGroups,
    bulkUpdatePrice: m.bulkUpdatePrice,
    bulkDeleteItems: m.bulkDeleteItems,
  },
}));
vi.mock("@/modules/menu/change-log/menu-change-log", () => ({ menuChangeLog: { recordMany: m.recordMany } }));
vi.mock("@/core/auth", () => ({ requirePermission: m.requirePermission }));
vi.mock("@/modules/menu/menu-authorization", () => ({ assertMenuResourceBranch: m.assertMenuResourceBranch }));

import { bulkOpsService } from "../bulk-ops.service";

const auth = (): AuthContext => ({
  userId: "u1", tenantId: "t1", email: "u@x", branchId: "b1", tenantWide: true,
  authorizedBranchIds: ["b1"], permissions: ["menu:update", "menu:delete"], roles: [], requestId: "r", ipAddress: "127.0.0.1",
});

describe("bulk ops service comprehensive coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.findItemScopes.mockResolvedValue([{ id: "i1", branchId: "b1" }, { id: "i2", branchId: null }]);
    m.updateItemsStatus.mockResolvedValue({ updated: 2 });
    m.updateItemsCategory.mockResolvedValue({ updated: 2 });
    m.bulkSetItemTags.mockResolvedValue({ updated: 2 });
    m.bulkSetItemModifierGroups.mockResolvedValue({ updated: 2 });
    m.bulkUpdatePrice.mockResolvedValue({ updated: 2, changes: [] });
    m.bulkDeleteItems.mockResolvedValue({ deleted: 2, protected: 0 });
    m.recordMany.mockResolvedValue(undefined);
  });

  it("updates status with and without a reason and records changes", async () => {
    await expect(bulkOpsService.updateItemsStatus(auth(), ["i1", "i2"], "ACTIVE", "back")).resolves.toEqual({ updated: 2 });
    expect(m.assertMenuResourceBranch).toHaveBeenCalledTimes(2);
    expect(m.recordMany).toHaveBeenLastCalledWith(expect.anything(), [
      expect.objectContaining({ entityId: "i1", changeType: "UPDATED", diff: { status: "ACTIVE", reason: "back" } }),
      expect.objectContaining({ entityId: "i2" }),
    ]);
    await bulkOpsService.updateItemsStatus(auth(), ["i1"], "HIDDEN");
    expect(m.recordMany).toHaveBeenLastCalledWith(expect.anything(), [expect.objectContaining({ diff: { status: "HIDDEN", reason: null } })]);
  });

  it("covers category, tags, modifiers, pricing and delete operations", async () => {
    await expect(bulkOpsService.updateItemsCategory(auth(), ["i1"], "c1")).resolves.toEqual({ updated: 2 });
    await expect(bulkOpsService.bulkSetItemTags(auth(), ["i1"], ["tag"], "add")).resolves.toEqual({ updated: 2 });
    await expect(bulkOpsService.bulkSetItemModifierGroups(auth(), ["i1"], ["m1"], "replace")).resolves.toEqual({ updated: 2 });
    await expect(bulkOpsService.bulkUpdatePrice(auth(), ["i1"], 10, "increase")).resolves.toMatchObject({ updated: 2 });
    await expect(bulkOpsService.bulkDeleteItems(auth(), ["i1"])).resolves.toEqual({ deleted: 2, protected: 0 });
    expect(m.requirePermission).toHaveBeenCalledWith(expect.anything(), "menu:delete");
    expect(m.recordMany).toHaveBeenCalledWith(expect.anything(), [expect.objectContaining({ changeType: "DELETED", diff: {} })]);
  });

  it("propagates permission, scope and repository failures", async () => {
    m.requirePermission.mockImplementationOnce(() => { throw new Error("denied"); });
    await expect(bulkOpsService.updateItemsCategory(auth(), ["i1"], "c1")).rejects.toThrow("denied");
    m.assertMenuResourceBranch.mockImplementationOnce(() => { throw new Error("scope"); });
    await expect(bulkOpsService.bulkSetItemTags(auth(), ["i1"], [], "remove")).rejects.toThrow("scope");
    m.findItemScopes.mockResolvedValueOnce([]);
    m.bulkUpdatePrice.mockRejectedValueOnce(new Error("db"));
    await expect(bulkOpsService.bulkUpdatePrice(auth(), [], 1, "set")).rejects.toThrow("db");
  });
});
