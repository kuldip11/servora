import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "@/core/auth";
const m = vi.hoisted(() => ({ status: vi.fn(), category: vi.fn(), tags: vi.fn(), modifiers: vi.fn(), price: vi.fn(), del: vi.fn() }));
vi.mock("../bulk-ops.service", () => ({ bulkOpsService: {
  updateItemsStatus: m.status, updateItemsCategory: m.category, bulkSetItemTags: m.tags,
  bulkSetItemModifierGroups: m.modifiers, bulkUpdatePrice: m.price, bulkDeleteItems: m.del,
} }));
import { bulkOpsController } from "../bulk-ops.controller";
const auth = {} as AuthContext;
describe("bulk ops controller comprehensive coverage", () => {
  beforeEach(() => { vi.clearAllMocks(); for (const f of Object.values(m)) f.mockResolvedValue({ updated: 1 }); });
  it("delegates every operation and wraps responses", async () => {
    await expect(bulkOpsController.updateItemsStatus(auth,["i"],"ACTIVE",undefined)).resolves.toMatchObject({ success:true,data:{updated:1} });
    await expect(bulkOpsController.updateItemsCategory(auth,["i"],"c")).resolves.toMatchObject({ success:true });
    await expect(bulkOpsController.bulkSetItemTags(auth,["i"],["t"],"add")).resolves.toMatchObject({ success:true });
    await expect(bulkOpsController.bulkSetItemModifierGroups(auth,["i"],["m"],"remove")).resolves.toMatchObject({ success:true });
    await expect(bulkOpsController.bulkUpdatePrice(auth,["i"],4,"set")).resolves.toMatchObject({ success:true });
    m.del.mockResolvedValueOnce({deleted:1,protected:0});
    await expect(bulkOpsController.bulkDeleteItems(auth,["i"])).resolves.toMatchObject({ success:true,data:{deleted:1} });
  });
});
