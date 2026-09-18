import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findById,
  findWasteReason,
  applyStockChange,
  findAllRecipeMenuItemIds,
} = vi.hoisted(() => ({
  findById: vi.fn(),
  findWasteReason: vi.fn(),
  applyStockChange: vi.fn(),
  findAllRecipeMenuItemIds: vi.fn(),
}));

vi.mock("../inventory.repository", () => ({
  inventoryRepository: {
    findById,
    findWasteReason,
    applyStockChange,
    findAllRecipeMenuItemIds,
  },
}));

const { publish } = vi.hoisted(() => ({ publish: vi.fn() }));
vi.mock("../../../lib/event-bus", () => ({ eventBus: { publish } }));

import { inventoryController } from "@/modules/inventory/inventory.controller";
import type { AuthContext } from "@/core/auth";

const auth: AuthContext = {
  userId: "u1",
  tenantId: "t1",
  branchId: "b1",
  email: "u@example.com",
  roles: [],
  permissions: ["inventory:update", "inventory:waste"],
  authorizedBranchIds: ["b1"],
};

beforeEach(() => {
  vi.clearAllMocks();
  findById.mockResolvedValue({ id: "i1", tenantId: "t1", branchId: "b1" });
  findWasteReason.mockResolvedValue({
    id: "wr1",
    tenantId: "t1",
    isActive: true,
  });
  findAllRecipeMenuItemIds.mockResolvedValue([]);
});

describe("POST /api/inventory/items/:id/waste flow", () => {
  it("persists a subtractive WASTE transaction with its reason attribution", async () => {
    applyStockChange.mockResolvedValue({
      status: "ok",
      item: {
        id: "i1",
        tenantId: "t1",
        branchId: "b1",
        name: "Tomato",
        unit: "KG",
        currentStock: "8",
        minimumStock: "1",
        reorderPoint: "2",
        costPerUnit: "3",
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-09-18T00:00:00.000Z"),
        updatedAt: new Date("2026-09-18T00:00:00.000Z"),
      },
      transaction: {
        id: "tx-waste",
        transactionType: "WASTE",
        quantity: "2",
        balanceBefore: "10",
        balanceAfter: "8",
        inventoryItemId: "i1",
        notes: "Trim loss",
        performedBy: "u1",
        wasteReasonId: "wr1",
        reversalOfDeductionId: null,
        createdAt: new Date("2026-09-18T00:00:00.000Z"),
      },
    });

    await expect(
      inventoryController.logWaste(auth, "i1", {
        quantity: 2,
        wasteReasonId: "wr1",
        notes: "Trim loss",
      }),
    ).resolves.toEqual({
      success: true,
      data: expect.objectContaining({
        transaction: expect.objectContaining({
          transactionType: "WASTE",
          balanceBefore: 10,
          balanceAfter: 8,
          wasteReasonId: "wr1",
        }),
      }),
    });

    expect(applyStockChange).toHaveBeenCalledWith(
      "t1",
      "i1",
      2,
      "WASTE",
      "u1",
      "Trim loss",
      "wr1",
    );
  });
});
