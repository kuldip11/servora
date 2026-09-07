import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findAllBranches,
  findMany,
  findBranch,
  create,
  findById,
  applyStockChange,
  findLowStock,
  findLowStockAllBranches,
  findRecentTransactions,
  findRequiredRecipeLines,
  findSubRecipeWithIngredients,
  deductRecipeLines,
  findByIds,
  findAllRecipeMenuItemIds,
  findScopedRecipeVariants,
  findScopedRecipeModifierOptions,
  findMenuItemsForAvailability,
  findOrderDeductions,
  listWasteReasons,
  findWasteReason,
  createWasteReason,
  updateWasteReason,
} = vi.hoisted(() => ({
  findAllBranches: vi.fn(),
  findMany: vi.fn(),
  findBranch: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  applyStockChange: vi.fn(),
  findLowStock: vi.fn(),
  findLowStockAllBranches: vi.fn(),
  findRecentTransactions: vi.fn(),
  findRequiredRecipeLines: vi.fn(),
  findSubRecipeWithIngredients: vi.fn(),
  deductRecipeLines: vi.fn(),
  findByIds: vi.fn(),
  findAllRecipeMenuItemIds: vi.fn(),
  findScopedRecipeVariants: vi.fn(),
  findScopedRecipeModifierOptions: vi.fn(),
  findMenuItemsForAvailability: vi.fn(),
  findOrderDeductions: vi.fn(),
  listWasteReasons: vi.fn(),
  findWasteReason: vi.fn(),
  createWasteReason: vi.fn(),
  updateWasteReason: vi.fn(),
}));

vi.mock("../inventory.repository", () => ({
  inventoryRepository: {
    findAllBranches,
    findMany,
    findBranch,
    create,
    findById,
    applyStockChange,
    findLowStock,
    findLowStockAllBranches,
    findRecentTransactions,
    findRequiredRecipeLines,
    findSubRecipeWithIngredients,
    deductRecipeLines,
    findByIds,
    findAllRecipeMenuItemIds,
    findScopedRecipeVariants,
    findScopedRecipeModifierOptions,
    findMenuItemsForAvailability,
    findOrderDeductions,
    listWasteReasons,
    findWasteReason,
    createWasteReason,
    updateWasteReason,
  },
}));

const { publish } = vi.hoisted(() => ({ publish: vi.fn() }));
vi.mock("../../../lib/event-bus", () => ({ eventBus: { publish } }));

const {
  applyInventoryItemSignal,
  applyInventoryVariantSignal,
  applyInventoryModifierSignal,
} = vi.hoisted(() => ({
  applyInventoryItemSignal: vi.fn(),
  applyInventoryVariantSignal: vi.fn(),
  applyInventoryModifierSignal: vi.fn(),
}));
vi.mock("../../menu/availability/availability.service", () => ({
  availabilityService: {
    applyInventoryItemSignal,
    applyInventoryVariantSignal,
    applyInventoryModifierSignal,
  },
}));

import {
  inventoryService,
  weightRecipeScale,
} from "@/modules/inventory/inventory.service";

const baseAuth: any = {
  userId: "u1",
  tenantId: "t1",
  branchId: "b1",
  email: "u@example.com",
  roles: [],
  permissions: [],
  authorizedBranchIds: ["b1"],
};

const rawRecipe = (overrides: Record<string, unknown> = {}) => {
  const base = {
    menuItemId: "m1",
    inventoryItemId: "i1",
    subRecipeId: null,
    variantId: null,
    modifierOptionId: null,
    unit: "KG",
    quantityRequired: "2",
    yieldPercent: null,
    menuItem: { enableRecipeDeduction: true },
    inventoryItem: {
      id: "i1",
      tenantId: "t1",
      branchId: "b1",
      unit: "KG",
      currentStock: "10",
      costPerUnit: "2",
      name: "Flour",
    },
    subRecipe: null,
    variant: null,
    modifierOption: null,
  };
  const next = { ...base, ...overrides };
  if (overrides.menuItem && typeof overrides.menuItem === "object") {
    next.menuItem = { ...base.menuItem, ...(overrides.menuItem as object) };
  }
  if (overrides.inventoryItem && typeof overrides.inventoryItem === "object") {
    next.inventoryItem = {
      ...base.inventoryItem,
      ...(overrides.inventoryItem as object),
    };
  }
  return next;
};

beforeEach(() => {
  vi.resetAllMocks();
  findAllRecipeMenuItemIds.mockResolvedValue([]);
  findScopedRecipeVariants.mockResolvedValue([]);
  findScopedRecipeModifierOptions.mockResolvedValue([]);
  findMenuItemsForAvailability.mockResolvedValue([]);
  findByIds.mockResolvedValue([]);
});

describe("inventory service", () => {
  it("lists all branches for tenant-wide context and branch items otherwise", async () => {
    findAllBranches.mockResolvedValue([{ id: "a" }]);
    findMany.mockResolvedValue([{ id: "b" }]);
    await expect(
      inventoryService.list({
        ...baseAuth,
        permissions: ["inventory:read"],
        tenantWide: true,
        branchId: null,
      }),
    ).resolves.toEqual({
      items: [{ id: "a" }],
      total: 1,
      page: 1,
      limit: 25,
    });
    await expect(
      inventoryService.list({ ...baseAuth, permissions: ["inventory:read"] }),
    ).resolves.toEqual({
      items: [{ id: "b" }],
      total: 1,
      page: 1,
      limit: 25,
    });
    expect(findMany).toHaveBeenCalledWith("t1", "b1");
  });

  it("creates inventory and publishes low-stock events", async () => {
    findBranch.mockResolvedValue({ id: "b1" });
    create.mockResolvedValue({
      id: "i1",
      branchId: "b1",
      currentStock: "2",
      minimumStock: "3",
    });
    const input: any = {
      name: "Flour",
      unit: "KG",
      currentStock: 2,
      minimumStock: 3,
      reorderPoint: 4,
      costPerUnit: 2,
    };
    await expect(
      inventoryService.create(
        { ...baseAuth, permissions: ["inventory:create"] },
        input,
      ),
    ).resolves.toMatchObject({ id: "i1" });
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: "inventory.low_stock" }),
      "t1",
      "b1",
    );
  });

  it("maps stock update outcomes and syncs availability on success", async () => {
    findById.mockResolvedValue({ id: "i1", branchId: "b1" });
    applyStockChange.mockResolvedValue({ status: "insufficient_stock" });
    await expect(
      inventoryService.updateStock(
        { ...baseAuth, permissions: ["inventory:update"] },
        "i1",
        { quantity: 5, transactionType: "OUT" } as any,
      ),
    ).rejects.toThrow("Insufficient stock");

    applyStockChange.mockResolvedValue({
      status: "ok",
      item: { id: "i1", branchId: "b1", currentStock: "2", minimumStock: "3" },
      transaction: { id: "tx1" },
    });
    await expect(
      inventoryService.updateStock(
        { ...baseAuth, permissions: ["inventory:update"] },
        "i1",
        { quantity: 1, transactionType: "IN" } as any,
      ),
    ).resolves.toEqual({
      item: expect.any(Object),
      transaction: { id: "tx1" },
    });
    expect(findAllRecipeMenuItemIds).toHaveBeenCalledWith("t1", "b1");
    expect(publish).toHaveBeenCalled();
  });

  it("validates recipe stock and ignores deduction-disabled recipes", async () => {
    findRequiredRecipeLines.mockResolvedValue([
      rawRecipe({
        inventoryItem: {
          id: "i1",
          tenantId: "t1",
          branchId: "b1",
          currentStock: "3",
          costPerUnit: "2",
          name: "Flour",
        },
      }),
      rawRecipe({
        menuItemId: "m2",
        inventoryItemId: "i2",
        quantityRequired: "9",
        menuItem: { enableRecipeDeduction: false },
        inventoryItem: {
          id: "i2",
          tenantId: "t1",
          branchId: "b1",
          currentStock: "0",
          costPerUnit: "1",
          name: "Salt",
        },
      }),
    ]);
    await expect(
      inventoryService.validateStock("t1", "b1", [
        { menuItemId: "m1", quantity: 2 },
        { menuItemId: "m2", quantity: 1 },
      ]),
    ).resolves.toEqual({
      valid: false,
      insufficient: [
        { menuItemId: "m1", inventoryItemId: "i1", name: "Flour" },
      ],
    });
  });

  it("E1 uses matching variant rows as overrides and modifier rows as additive consumption", async () => {
    findRequiredRecipeLines.mockResolvedValue([
      rawRecipe({ quantityRequired: "1" }),
      rawRecipe({ variantId: "v-large", quantityRequired: "2" }),
      rawRecipe({
        inventoryItemId: "i-cheese",
        modifierOptionId: "opt-cheese",
        quantityRequired: "0.5",
        unit: "KG",
        inventoryItem: {
          id: "i-cheese",
          tenantId: "t1",
          branchId: "b1",
          currentStock: "10",
          costPerUnit: "8",
          name: "Cheese",
        },
      }),
    ]);
    deductRecipeLines.mockResolvedValue({
      deducted: 2,
      touchedInventoryItemIds: [],
      short: [],
    });

    await inventoryService.deductForOrderItems(
      "t1",
      "b1",
      "o1",
      "kt1",
      [
        {
          orderItemId: "oi1",
          menuItemId: "m1",
          variantId: "v-large",
          quantity: 1,
          selectedOptions: [{ optionId: "opt-cheese", quantity: 2 }],
        },
      ],
      "u1",
    );

    expect(deductRecipeLines).toHaveBeenCalledWith(
      "t1",
      "b1",
      "o1",
      "kt1",
      expect.arrayContaining([
        expect.objectContaining({
          orderItemId: "oi1",
          inventoryItemId: "i1",
          neededQuantity: 2,
        }),
        expect.objectContaining({
          orderItemId: "oi1",
          inventoryItemId: "i-cheese",
          neededQuantity: 1,
        }),
      ]),
      "u1",
    );
    const lines = deductRecipeLines.mock.calls[0]?.[4] as Array<{
      inventoryItemId: string;
    }>;
    expect(lines.filter((line) => line.inventoryItemId === "i1")).toHaveLength(
      1,
    );
  });

  it("E2/E3 recursively resolves a sub-recipe and applies both recipe and prep yield", async () => {
    findRequiredRecipeLines.mockResolvedValue([
      rawRecipe({
        inventoryItemId: null,
        subRecipeId: "sr-sauce",
        unit: "KG",
        quantityRequired: "5",
        yieldPercent: "50",
        inventoryItem: null,
        subRecipe: { id: "sr-sauce", tenantId: "t1" },
      }),
    ]);
    findSubRecipeWithIngredients.mockResolvedValue({
      id: "sr-sauce",
      tenantId: "t1",
      branchId: "b1",
      name: "Sauce",
      yieldQuantity: "10",
      yieldUnit: "KG",
      yieldPercent: "80",
      ingredients: [
        {
          inventoryItemId: "i-tomato",
          ingredientSubRecipeId: null,
          quantityRequired: "8",
          unit: "KG",
          inventoryItem: {
            id: "i-tomato",
            tenantId: "t1",
            branchId: "b1",
            unit: "KG",
            name: "Tomato",
            currentStock: "100",
            costPerUnit: "3",
          },
        },
      ],
    });
    deductRecipeLines.mockResolvedValue({
      deducted: 1,
      touchedInventoryItemIds: [],
      short: [],
    });

    await inventoryService.deductForOrderItems(
      "t1",
      "b1",
      "o1",
      "kt1",
      [{ orderItemId: "oi1", menuItemId: "m1", quantity: 1 }],
      "u1",
    );

    expect(deductRecipeLines).toHaveBeenCalledWith(
      "t1",
      "b1",
      "o1",
      "kt1",
      [
        expect.objectContaining({
          inventoryItemId: "i-tomato",
          neededQuantity: 10,
        }),
      ],
      "u1",
    );
  });

  it("E2 normalizes dish and raw ingredient units before recursive scaling", async () => {
    findRequiredRecipeLines.mockResolvedValue([
      rawRecipe({
        inventoryItemId: null,
        subRecipeId: "sr-sauce",
        unit: "GRAMS",
        quantityRequired: "500",
        inventoryItem: null,
        subRecipe: {
          id: "sr-sauce",
          tenantId: "t1",
          branchId: "b1",
          yieldUnit: "KG",
        },
      }),
    ]);
    findSubRecipeWithIngredients.mockResolvedValue({
      id: "sr-sauce",
      tenantId: "t1",
      branchId: "b1",
      name: "Sauce",
      yieldQuantity: "1",
      yieldUnit: "KG",
      yieldPercent: null,
      ingredients: [
        {
          inventoryItemId: "i-tomato",
          ingredientSubRecipeId: null,
          quantityRequired: "800",
          unit: "GRAMS",
          inventoryItem: {
            id: "i-tomato",
            tenantId: "t1",
            branchId: "b1",
            unit: "KG",
            name: "Tomato",
            currentStock: "10",
            costPerUnit: "3",
          },
        },
      ],
    });
    deductRecipeLines.mockResolvedValue({
      deducted: 1,
      touchedInventoryItemIds: [],
      short: [],
    });

    await inventoryService.deductForOrderItems(
      "t1",
      "b1",
      "o1",
      "kt1",
      [{ orderItemId: "oi1", menuItemId: "m1", quantity: 1 }],
      "u1",
    );

    expect(deductRecipeLines).toHaveBeenCalledWith(
      "t1",
      "b1",
      "o1",
      "kt1",
      [
        expect.objectContaining({
          inventoryItemId: "i-tomato",
          unit: "KG",
          neededQuantity: 0.4,
        }),
      ],
      "u1",
    );
  });

  it("E2 rejects a sub-recipe from another branch instead of silently skipping stock", async () => {
    findRequiredRecipeLines.mockResolvedValue([
      rawRecipe({
        inventoryItemId: null,
        subRecipeId: "sr-other",
        unit: "KG",
        quantityRequired: "1",
        inventoryItem: null,
        subRecipe: {
          id: "sr-other",
          tenantId: "t1",
          branchId: "b2",
          yieldUnit: "KG",
        },
      }),
    ]);
    findSubRecipeWithIngredients.mockResolvedValue({
      id: "sr-other",
      tenantId: "t1",
      branchId: "b2",
      name: "Other branch sauce",
      yieldQuantity: "1",
      yieldUnit: "KG",
      yieldPercent: null,
      ingredients: [],
    });

    await expect(
      inventoryService.computeRecipeCost("t1", "b1", {
        menuItemId: "m1",
        quantity: 1,
      }),
    ).rejects.toThrow("not compatible with the active branch");
  });

  it("E2 rejects incompatible units instead of calculating a bogus quantity", async () => {
    findRequiredRecipeLines.mockResolvedValue([
      rawRecipe({ unit: "LITERS", quantityRequired: "1" }),
    ]);

    await expect(
      inventoryService.computeRecipeCost("t1", "b1", {
        menuItemId: "m1",
        quantity: 1,
      }),
    ).rejects.toThrow("incompatible units");
  });

  it("E6 computes recipe cost from the same scoped/yield-aware resolver", async () => {
    findRequiredRecipeLines.mockResolvedValue([
      rawRecipe({ quantityRequired: "2", yieldPercent: "50" }),
    ]);
    await expect(
      inventoryService.computeRecipeCost("t1", "b1", {
        menuItemId: "m1",
        quantity: 99,
      }),
    ).resolves.toBe(8);
  });

  it("E6 computes recipe cost even when automatic stock deduction is disabled", async () => {
    findRequiredRecipeLines.mockResolvedValue([
      rawRecipe({
        quantityRequired: "2",
        menuItem: { enableRecipeDeduction: false },
      }),
    ]);

    await expect(
      inventoryService.computeRecipeCost("t1", "b1", {
        menuItemId: "m1",
        quantity: 1,
      }),
    ).resolves.toBe(4);
  });

  it("E3 rejects non-positive WASTE quantities on the generic stock path", async () => {
    findById.mockResolvedValue({ id: "i1", branchId: "b1" });
    findWasteReason.mockResolvedValue({
      id: "wr1",
      tenantId: "t1",
      isActive: true,
    });

    await expect(
      inventoryService.updateStock(
        { ...baseAuth, permissions: ["inventory:update", "inventory:waste"] },
        "i1",
        { quantity: -2, transactionType: "WASTE", wasteReasonId: "wr1" },
      ),
    ).rejects.toThrow("greater than zero");
    expect(applyStockChange).not.toHaveBeenCalled();
  });

  it("E3 requires an active reason for waste and persists reason attribution", async () => {
    findById.mockResolvedValue({ id: "i1", branchId: "b1" });
    await expect(
      inventoryService.logWaste(
        { ...baseAuth, permissions: ["inventory:update", "inventory:waste"] },
        "i1",
        { quantity: 1, wasteReasonId: "wr1" },
      ),
    ).rejects.toThrow("Waste reason is invalid or inactive");

    findWasteReason.mockResolvedValue({
      id: "wr1",
      tenantId: "t1",
      isActive: true,
    });
    applyStockChange.mockResolvedValue({
      status: "ok",
      item: { id: "i1", branchId: "b1", currentStock: "8", minimumStock: "2" },
      transaction: { id: "tx-waste" },
    });
    await inventoryService.logWaste(
      { ...baseAuth, permissions: ["inventory:update", "inventory:waste"] },
      "i1",
      { quantity: 2, wasteReasonId: "wr1", notes: "Trim loss" },
    );
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

  it("deducts recipe lines only when recipe deduction is enabled", async () => {
    findRequiredRecipeLines.mockResolvedValue([rawRecipe()]);
    deductRecipeLines.mockResolvedValue({
      deducted: 1,
      touchedInventoryItemIds: [],
      short: [],
    });
    await expect(
      inventoryService.deductForOrderItems(
        "t1",
        "b1",
        "o1",
        "kt1",
        [{ orderItemId: "oi1", menuItemId: "m1", quantity: 3 }],
        "u1",
      ),
    ).resolves.toEqual({ deducted: 1, short: [] });
    expect(deductRecipeLines).toHaveBeenCalledWith(
      "t1",
      "b1",
      "o1",
      "kt1",
      [expect.objectContaining({ neededQuantity: 6 })],
      "u1",
    );
  });

  it("E4 auto-86s only the depleted scoped variant and never touches manual override", async () => {
    findAllRecipeMenuItemIds.mockResolvedValue(["m1"]);
    findRequiredRecipeLines.mockResolvedValue([
      rawRecipe({
        variantId: "v-large",
        inventoryItem: {
          id: "i1",
          tenantId: "t1",
          branchId: "b1",
          currentStock: "1",
          costPerUnit: "2",
          name: "Flour",
        },
      }),
    ]);
    findMenuItemsForAvailability.mockResolvedValue([
      { id: "m1", enableRecipeDeduction: true, status: "ACTIVE" },
    ]);
    findScopedRecipeVariants.mockResolvedValue([
      {
        id: "v-large",
        menuItemId: "m1",
        status: "ACTIVE",
        manualOverrideStatus: "OUT_OF_STOCK",
        enableRecipeDeduction: true,
      },
      {
        id: "v-small",
        menuItemId: "m1",
        status: "ACTIVE",
        manualOverrideStatus: null,
        enableRecipeDeduction: true,
      },
      {
        id: "v-medium",
        menuItemId: "m1",
        status: "ACTIVE",
        manualOverrideStatus: null,
        enableRecipeDeduction: true,
      },
    ]);

    await inventoryService.syncMenuItemAvailability("t1", "b1", ["i1"]);

    expect(applyInventoryVariantSignal).toHaveBeenCalledTimes(3);
    expect(applyInventoryVariantSignal).toHaveBeenCalledWith(
      "t1",
      "b1",
      "v-large",
      false,
    );
    expect(applyInventoryVariantSignal).toHaveBeenCalledWith(
      "t1",
      "b1",
      "v-small",
      true,
    );
    expect(applyInventoryVariantSignal).toHaveBeenCalledWith(
      "t1",
      "b1",
      "v-medium",
      true,
    );
    expect(applyInventoryItemSignal).toHaveBeenCalledWith(
      "t1",
      "b1",
      "m1",
      true,
    );

    findRequiredRecipeLines.mockResolvedValue([
      rawRecipe({
        variantId: "v-large",
        inventoryItem: {
          id: "i1",
          tenantId: "t1",
          branchId: "b1",
          currentStock: "3",
          costPerUnit: "2",
          name: "Flour",
        },
      }),
    ]);
    findScopedRecipeVariants.mockResolvedValue([
      {
        id: "v-large",
        menuItemId: "m1",
        status: "OUT_OF_STOCK",
        manualOverrideStatus: "OUT_OF_STOCK",
        enableRecipeDeduction: true,
      },
    ]);
    await inventoryService.syncMenuItemAvailability("t1", "b1", ["i1"]);
    expect(applyInventoryVariantSignal).toHaveBeenLastCalledWith(
      "t1",
      "b1",
      "v-large",
      true,
    );
  });

  it("E4 reports base, variant, and modifier recipe impact for an ingredient", async () => {
    findById.mockResolvedValue({
      id: "i1",
      tenantId: "t1",
      branchId: "b1",
      name: "Flour",
    });
    findAllRecipeMenuItemIds.mockResolvedValue(["m1"]);
    findMenuItemsForAvailability.mockResolvedValue([
      {
        id: "m1",
        name: "Pizza",
        enableRecipeDeduction: true,
        status: "ACTIVE",
      },
    ]);
    findScopedRecipeVariants.mockResolvedValue([
      {
        id: "v-large",
        name: "Large",
        menuItemId: "m1",
        menuItemName: "Pizza",
        status: "ACTIVE",
        manualOverrideStatus: null,
      },
    ]);
    findScopedRecipeModifierOptions.mockResolvedValue([
      {
        id: "opt-extra",
        name: "Extra crust",
        menuItemId: "m1",
        menuItemName: "Pizza",
        isAvailable: true,
        computedAvailability: true,
        manualOverrideAvailability: null,
      },
    ]);
    findRequiredRecipeLines.mockResolvedValue([
      rawRecipe({ quantityRequired: "1" }),
      rawRecipe({ variantId: "v-large", quantityRequired: "2" }),
      rawRecipe({ modifierOptionId: "opt-extra", quantityRequired: "0.5" }),
    ]);

    const result = await inventoryService.getRecipeImpact(
      { ...baseAuth, permissions: ["inventory:read"] },
      "i1",
    );

    expect(result.impacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "ITEM", entityName: "Pizza" }),
        expect.objectContaining({ kind: "VARIANT", entityName: "Large" }),
        expect.objectContaining({
          kind: "MODIFIER_OPTION",
          entityName: "Extra crust",
        }),
      ]),
    );
  });

  it("E4 preserves a manual modifier hold when ingredients are replenished", async () => {
    findAllRecipeMenuItemIds.mockResolvedValue(["m1"]);
    findMenuItemsForAvailability.mockResolvedValue([
      { id: "m1", enableRecipeDeduction: true, status: "ACTIVE" },
    ]);
    findRequiredRecipeLines.mockResolvedValue([
      rawRecipe({
        inventoryItemId: "i-cheese",
        modifierOptionId: "opt-cheese",
        quantityRequired: "1",
        inventoryItem: {
          id: "i-cheese",
          tenantId: "t1",
          branchId: "b1",
          currentStock: "5",
          costPerUnit: "8",
          name: "Cheese",
        },
      }),
    ]);
    findScopedRecipeModifierOptions.mockResolvedValue([
      {
        id: "opt-cheese",
        menuItemId: "m1",
        isAvailable: false,
        computedAvailability: false,
        manualOverrideAvailability: false,
        enableRecipeDeduction: true,
      },
    ]);

    await inventoryService.syncMenuItemAvailability("t1", "b1", ["i-cheese"]);

    expect(applyInventoryModifierSignal).toHaveBeenCalledWith(
      "t1",
      "b1",
      "m1",
      "opt-cheese",
      true,
    );
  });

  it("E4 does not auto-86 variant/modifier scopes when recipe deduction is disabled", async () => {
    findAllRecipeMenuItemIds.mockResolvedValue(["m1"]);
    findMenuItemsForAvailability.mockResolvedValue([
      { id: "m1", enableRecipeDeduction: false, status: "ACTIVE" },
    ]);
    findRequiredRecipeLines.mockResolvedValue([
      rawRecipe({
        variantId: "v-large",
        inventoryItem: {
          id: "i1",
          tenantId: "t1",
          branchId: "b1",
          currentStock: "0",
          costPerUnit: "2",
          name: "Flour",
          unit: "KG",
        },
      }),
      rawRecipe({ modifierOptionId: "opt-extra" }),
    ]);
    findScopedRecipeVariants.mockResolvedValue([
      { id: "v-large", menuItemId: "m1", enableRecipeDeduction: false },
    ]);
    findScopedRecipeModifierOptions.mockResolvedValue([
      { id: "opt-extra", menuItemId: "m1", enableRecipeDeduction: false },
    ]);

    await inventoryService.syncMenuItemAvailability("t1", "b1", ["i1"]);

    expect(applyInventoryItemSignal).not.toHaveBeenCalled();
    expect(applyInventoryVariantSignal).not.toHaveBeenCalled();
    expect(applyInventoryModifierSignal).not.toHaveBeenCalled();
  });

  it("re-syncs base menu items to OUT_OF_STOCK and back when ingredients change", async () => {
    findAllRecipeMenuItemIds.mockResolvedValue(["m1"]);
    findMenuItemsForAvailability.mockResolvedValue([
      { id: "m1", enableRecipeDeduction: true, status: "ACTIVE" },
    ]);
    findRequiredRecipeLines.mockResolvedValue([
      rawRecipe({
        inventoryItem: {
          id: "i1",
          tenantId: "t1",
          branchId: "b1",
          currentStock: "1",
          costPerUnit: "2",
          name: "Flour",
        },
      }),
    ]);
    await inventoryService.syncMenuItemAvailability("t1", "b1", ["i1"]);
    expect(applyInventoryItemSignal).toHaveBeenCalledWith(
      "t1",
      "b1",
      "m1",
      false,
    );

    findMenuItemsForAvailability.mockResolvedValue([
      { id: "m1", enableRecipeDeduction: true, status: "OUT_OF_STOCK" },
    ]);
    findRequiredRecipeLines.mockResolvedValue([
      rawRecipe({
        inventoryItem: {
          id: "i1",
          tenantId: "t1",
          branchId: "b1",
          currentStock: "3",
          costPerUnit: "2",
          name: "Flour",
        },
      }),
    ]);
    await inventoryService.syncMenuItemAvailability("t1", "b1", ["i1"]);
    expect(applyInventoryItemSignal).toHaveBeenLastCalledWith(
      "t1",
      "b1",
      "m1",
      true,
    );
  });
});

describe("G3 weight-based recipe consumption", () => {
  it("normalizes supported weight units to recipe kilograms", () => {
    expect(weightRecipeScale(450, "G")).toBeCloseTo(0.45, 8);
    expect(weightRecipeScale(0.45, "KG")).toBeCloseTo(0.45, 8);
    expect(weightRecipeScale(1, "LB")).toBeCloseTo(0.45359237, 8);
    expect(weightRecipeScale(16, "OZ")).toBeCloseTo(0.45359237, 8);
  });

  it("scales recipe deduction by captured order weight", async () => {
    findRequiredRecipeLines.mockResolvedValue([
      rawRecipe({ quantityRequired: "2" }),
    ]);
    deductRecipeLines.mockResolvedValue({
      deducted: 1,
      touchedInventoryItemIds: [],
      short: [],
    });
    await inventoryService.deductForOrderItems(
      "t1",
      "b1",
      "o-weight",
      "kt-weight",
      [
        {
          orderItemId: "oi-weight",
          menuItemId: "m1",
          quantity: 1,
          weightQuantity: 450,
          weightUnit: "G",
        },
      ],
      "u1",
    );
    expect(deductRecipeLines).toHaveBeenCalledWith(
      "t1",
      "b1",
      "o-weight",
      "kt-weight",
      [
        expect.objectContaining({
          orderItemId: "oi-weight",
          neededQuantity: 0.9,
        }),
      ],
      "u1",
    );
  });
});

describe("inventory recipe service completion coverage", () => {
  it("covers recipe-impact missing/empty and disabled/nonmatching impact rows", async () => {
    findById.mockResolvedValueOnce(undefined);
    await expect(inventoryService.getRecipeImpact({ ...baseAuth, permissions:["inventory:read"] },"missing")).rejects.toThrow();
    findById.mockResolvedValueOnce({id:"i1",tenantId:"t1",branchId:"b1",name:"Milk"});findAllRecipeMenuItemIds.mockResolvedValueOnce([]);
    await expect(inventoryService.getRecipeImpact({ ...baseAuth, permissions:["inventory:read"] },"i1")).resolves.toEqual({inventoryItemId:"i1",inventoryItemName:"Milk",impacts:[]});
    findById.mockResolvedValueOnce({id:"i1",tenantId:"t1",branchId:"b1",name:"Milk"});findAllRecipeMenuItemIds.mockResolvedValueOnce(["m1"]);findRequiredRecipeLines.mockResolvedValueOnce([]);findMenuItemsForAvailability.mockResolvedValueOnce([{id:"m1",name:"Pizza",enableRecipeDeduction:false}]);findScopedRecipeVariants.mockResolvedValueOnce([{id:"v1",menuItemId:"m1",menuItemName:"Pizza",name:"Large"}]);findScopedRecipeModifierOptions.mockResolvedValueOnce([{id:"op1",menuItemId:"m1",menuItemName:"Pizza",name:"Extra"}]);
    await expect(inventoryService.getRecipeImpact({ ...baseAuth, permissions:["inventory:read"] },"i1")).resolves.toMatchObject({impacts:[]});
  });

  it("covers empty stock validation, repeated needs and sufficient totals", async () => {
    await expect(inventoryService.validateStock("t1","b1",[])).resolves.toEqual({valid:true,insufficient:[]});
    findRequiredRecipeLines.mockResolvedValueOnce([rawRecipe({quantityRequired:"1"})]);
    await expect(inventoryService.validateStock("t1","b1",[{menuItemId:"m1",quantity:1},{menuItemId:"m1",quantity:1}])).resolves.toEqual({valid:true,insufficient:[]});
  });

  it("covers empty/no-recipe costs and shared subrecipe cache", async () => {
    await expect(inventoryService.computeRecipeCosts("t1","b1",[])).resolves.toEqual([]);
    findRequiredRecipeLines.mockResolvedValueOnce([]);
    await expect(inventoryService.computeRecipeCosts("t1","b1",[{menuItemId:"m1",quantity:1}])).resolves.toEqual([null]);
    findRequiredRecipeLines.mockResolvedValueOnce([]);
    await expect(inventoryService.computeRecipeCost("t1","b1",{menuItemId:"m1",quantity:1})).resolves.toBe(0);
    findRequiredRecipeLines.mockResolvedValueOnce([rawRecipe({inventoryItemId:null,subRecipeId:"s1",unit:"KG",quantityRequired:"1",inventoryItem:null,subRecipe:{id:"s1",tenantId:"t1"}})]);
    findSubRecipeWithIngredients.mockResolvedValue({id:"s1",tenantId:"t1",branchId:"b1",name:"Sauce",yieldQuantity:"1",yieldUnit:"KG",yieldPercent:null,ingredients:[]});
    await inventoryService.computeRecipeCosts("t1","b1",[{menuItemId:"m1",quantity:1},{menuItemId:"m1",quantity:1}]);
    expect(findSubRecipeWithIngredients).toHaveBeenCalledTimes(1);
  });

  it("covers unresolved, tenant/branch-invalid, nested, circular and too-deep subrecipes", async () => {
    const subRow=rawRecipe({inventoryItemId:null,subRecipeId:"s1",unit:"KG",quantityRequired:"1",inventoryItem:null,subRecipe:{id:"s1",tenantId:"t1"}});
    findRequiredRecipeLines.mockResolvedValue([subRow]); findSubRecipeWithIngredients.mockResolvedValueOnce(undefined);
    await expect(inventoryService.computeRecipeCost("t1","b1",{menuItemId:"m1",quantity:1})).rejects.toThrow("could not be resolved");

    findSubRecipeWithIngredients.mockResolvedValueOnce({id:"s1",tenantId:"t1",branchId:"b1",name:null,yieldQuantity:"1",yieldUnit:"KG",yieldPercent:null,ingredients:[{inventoryItemId:"i1",ingredientSubRecipeId:null,quantityRequired:"1",unit:"KG",inventoryItem:{id:"i1",tenantId:"t2",branchId:"b1",unit:"KG",name:"X",currentStock:"1",costPerUnit:"1"}}]});
    await expect(inventoryService.computeRecipeCost("t1","b1",{menuItemId:"m1",quantity:1})).rejects.toThrow("outside this tenant");

    findSubRecipeWithIngredients.mockResolvedValueOnce({id:"s1",tenantId:"t1",branchId:"b1",name:"S",yieldQuantity:"1",yieldUnit:"KG",yieldPercent:null,ingredients:[{inventoryItemId:"i1",ingredientSubRecipeId:null,quantityRequired:"1",unit:"KG",inventoryItem:{id:"i1",tenantId:"t1",branchId:"b2",unit:"KG",name:"X",currentStock:"1",costPerUnit:"1"}}]});
    await expect(inventoryService.computeRecipeCost("t1","b1",{menuItemId:"m1",quantity:1})).rejects.toThrow("active branch");
    findSubRecipeWithIngredients.mockResolvedValueOnce({id:"s1",tenantId:"t1",branchId:"b2",name:null,yieldQuantity:"1",yieldUnit:"KG",yieldPercent:null,ingredients:[]});
    await expect(inventoryService.computeRecipeCost("t1","b1",{menuItemId:"m1",quantity:1})).rejects.toThrow("Sub-recipe s1");
    findSubRecipeWithIngredients.mockResolvedValueOnce({id:"s1",tenantId:"t1",branchId:"b1",name:null,yieldQuantity:"1",yieldUnit:"KG",yieldPercent:null,ingredients:[{inventoryItemId:"i1",ingredientSubRecipeId:null,quantityRequired:"1",unit:"KG",inventoryItem:{id:"i1",tenantId:"t1",branchId:"b2",unit:"KG",name:"X",currentStock:"1",costPerUnit:"1"}}]});
    await expect(inventoryService.computeRecipeCost("t1","b1",{menuItemId:"m1",quantity:1})).rejects.toThrow("Sub-recipe s1");

    findSubRecipeWithIngredients.mockImplementation(async(_t:string,id:string)=> id==="s1"?{id:"s1",tenantId:"t1",branchId:"b1",name:"S1",yieldQuantity:"1",yieldUnit:"KG",yieldPercent:null,ingredients:[{inventoryItemId:null,ingredientSubRecipeId:"s2",quantityRequired:"1",unit:"KG",inventoryItem:null}]}:{id:"s2",tenantId:"t1",branchId:"b1",name:"S2",yieldQuantity:"1",yieldUnit:"KG",yieldPercent:null,ingredients:[{inventoryItemId:"i2",ingredientSubRecipeId:null,quantityRequired:"1",unit:"KG",inventoryItem:{id:"i2",tenantId:"t1",branchId:"b1",unit:"KG",name:"Y",currentStock:"2",costPerUnit:"3"}}]});
    await expect(inventoryService.computeRecipeCost("t1","b1",{menuItemId:"m1",quantity:1})).resolves.toBe(3);

    findSubRecipeWithIngredients.mockImplementation(async()=>({id:"s1",tenantId:"t1",branchId:"b1",name:"S1",yieldQuantity:"1",yieldUnit:"KG",yieldPercent:null,ingredients:[{inventoryItemId:null,ingredientSubRecipeId:"s1",quantityRequired:"1",unit:"KG",inventoryItem:null}]}));
    await expect(inventoryService.computeRecipeCost("t1","b1",{menuItemId:"m1",quantity:1})).rejects.toThrow("Circular");

    findSubRecipeWithIngredients.mockImplementation(async(_t:string,id:string)=>({id,tenantId:"t1",branchId:"b1",name:id,yieldQuantity:"1",yieldUnit:"KG",yieldPercent:null,ingredients:[{inventoryItemId:null,ingredientSubRecipeId:`s${Number(id.slice(1))+1}`,quantityRequired:"1",unit:"KG",inventoryItem:null}]}));
    await expect(inventoryService.computeRecipeCost("t1","b1",{menuItemId:"m1",quantity:1})).rejects.toThrow("depth exceeds");
  });

  it("covers recipe ingredient branch mismatch", async () => {
    findRequiredRecipeLines.mockResolvedValueOnce([rawRecipe({inventoryItem:{id:"i1",tenantId:"t1",branchId:"b2",unit:"KG",currentStock:"1",costPerUnit:"1",name:"Wrong"}})]);
    await expect(inventoryService.computeRecipeCost("t1","b1",{menuItemId:"m1",quantity:1})).rejects.toThrow("active branch");
  });

  it("covers deduction early exits, no-lines, aggregation, touched stock sync and low-stock events", async () => {
    await expect(inventoryService.deductForOrderItems("t1","b1","o","kt",[],null)).resolves.toEqual({deducted:0,short:[]});
    findRequiredRecipeLines.mockResolvedValueOnce([]);await expect(inventoryService.deductForOrderItems("t1","b1","o","kt",[{orderItemId:"oi",menuItemId:"m1",quantity:1}],null)).resolves.toEqual({deducted:0,short:[]});
    findRequiredRecipeLines.mockResolvedValueOnce([rawRecipe({menuItemId:"other"})]);await expect(inventoryService.deductForOrderItems("t1","b1","o","kt",[{orderItemId:"oi",menuItemId:"m1",quantity:1}],null)).resolves.toEqual({deducted:0,short:[]});
    findRequiredRecipeLines.mockResolvedValueOnce([rawRecipe({quantityRequired:"1"}),rawRecipe({quantityRequired:"2"})]);deductRecipeLines.mockResolvedValueOnce({deducted:1,touchedInventoryItemIds:["i1","i2"],short:[]});findByIds.mockResolvedValueOnce([{id:"i1",branchId:"b1",currentStock:"1",minimumStock:"2"},{id:"i2",branchId:"b1",currentStock:"3",minimumStock:"2"}]);findAllRecipeMenuItemIds.mockResolvedValueOnce([]);
    await inventoryService.deductForOrderItems("t1","b1","o","kt",[{orderItemId:"oi",menuItemId:"m1",quantity:1}],"u1");expect(deductRecipeLines).toHaveBeenCalledWith("t1","b1","o","kt",[expect.objectContaining({neededQuantity:3})],"u1");expect(publish).toHaveBeenCalledTimes(1);
    findRequiredRecipeLines.mockResolvedValueOnce([rawRecipe({quantityRequired:"1"})]);deductRecipeLines.mockResolvedValueOnce({deducted:1,touchedInventoryItemIds:[],short:[]});await inventoryService.deductForOrderItems("t1","b1","o","kt",[{orderItemId:"same",menuItemId:"m1",quantity:1},{orderItemId:"same",menuItemId:"m1",quantity:2}],"u1");expect(deductRecipeLines).toHaveBeenLastCalledWith("t1","b1","o","kt",[expect.objectContaining({neededQuantity:3})],"u1");
  });

  it("clears recipe availability signals for only the selected menu item", async () => {
    findScopedRecipeVariants.mockResolvedValue([{id:"v1",menuItemId:"m1"},{id:"v2",menuItemId:"other"}]);findScopedRecipeModifierOptions.mockResolvedValue([{id:"op1",menuItemId:"m1"},{id:"op2",menuItemId:"other"}]);
    await inventoryService.clearRecipeAvailabilitySignals("t1","b1","m1");
    expect(applyInventoryItemSignal).toHaveBeenCalledWith("t1","b1","m1",true);expect(applyInventoryVariantSignal).toHaveBeenCalledTimes(1);expect(applyInventoryModifierSignal).toHaveBeenCalledTimes(1);
  });

  it("syncs recipe configuration including previous/current scoped IDs and skips disabled scopes", async () => {
    findRequiredRecipeLines.mockResolvedValue([rawRecipe(),rawRecipe({variantId:"v1"}),rawRecipe({modifierOptionId:"op1"})]);findMenuItemsForAvailability.mockResolvedValue([{id:"m1",enableRecipeDeduction:true}]);findScopedRecipeVariants.mockResolvedValue([{id:"v1",menuItemId:"m1",enableRecipeDeduction:true},{id:"vDisabled",menuItemId:"m1",enableRecipeDeduction:false}]);findScopedRecipeModifierOptions.mockResolvedValue([{id:"op1",menuItemId:"m1",enableRecipeDeduction:true},{id:"opDisabled",menuItemId:"m1",enableRecipeDeduction:false}]);
    await inventoryService.syncRecipeConfigurationAvailability("t1","b1","m1",["vPrev","vDisabled"],["opPrev","opDisabled"]);
    expect(applyInventoryItemSignal).toHaveBeenCalled();expect(applyInventoryVariantSignal).toHaveBeenCalledWith("t1","b1","v1",expect.any(Boolean));expect(applyInventoryVariantSignal).toHaveBeenCalledWith("t1","b1","vPrev",expect.any(Boolean));expect(applyInventoryModifierSignal).toHaveBeenCalledWith("t1","b1","m1","op1",expect.any(Boolean));expect(applyInventoryModifierSignal).toHaveBeenCalledWith("t1","b1","m1","opPrev",expect.any(Boolean));
    expect(applyInventoryVariantSignal).not.toHaveBeenCalledWith("t1","b1","vDisabled",expect.any(Boolean));expect(applyInventoryModifierSignal).not.toHaveBeenCalledWith("t1","b1","m1","opDisabled",expect.any(Boolean));
  });

  it("returns early from recipe configuration when item missing/disabled and from availability for empty inputs", async () => {
    findRequiredRecipeLines.mockResolvedValue([]);findMenuItemsForAvailability.mockResolvedValue([]);await inventoryService.syncRecipeConfigurationAvailability("t1","b1","m1");expect(applyInventoryItemSignal).not.toHaveBeenCalled();
    findMenuItemsForAvailability.mockResolvedValueOnce([{id:"m1",enableRecipeDeduction:false}]);await inventoryService.syncRecipeConfigurationAvailability("t1","b1","m1");expect(applyInventoryItemSignal).not.toHaveBeenCalled();
    findAllRecipeMenuItemIds.mockClear(); findRequiredRecipeLines.mockClear();
    await inventoryService.syncMenuItemAvailability("t1","b1",[]);expect(findAllRecipeMenuItemIds).not.toHaveBeenCalled();
    findAllRecipeMenuItemIds.mockResolvedValueOnce([]);await inventoryService.syncMenuItemAvailability("t1","b1",["i1"]);expect(findRequiredRecipeLines).not.toHaveBeenCalled();
  });
});
