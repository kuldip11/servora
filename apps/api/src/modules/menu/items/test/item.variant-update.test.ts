import { beforeEach, describe, expect, it, vi } from "vitest";

const { findById, update, setVariants, validateVariantSync } = vi.hoisted(
  () => ({
    findById: vi.fn(),
    update: vi.fn(),
    setVariants: vi.fn(),
    validateVariantSync: vi.fn(),
  }),
);
const { record } = vi.hoisted(() => ({ record: vi.fn() }));

vi.mock("../item.repository", () => ({
  itemRepository: {
    findById,
    update,
    setVariants,
    validateVariantSync,
  },
}));
vi.mock("../../modifiers/modifier.repository", () => ({
  modifierRepository: {
    findOwnedTagIds: vi.fn(),
    findOwnedModifierGroupIds: vi.fn(),
  },
}));
vi.mock("../../change-log/menu-change-log", () => ({
  buildDiff: vi.fn(() => ({})),
  menuChangeLog: { record },
}));
vi.mock("../../../inventory/inventory.service", () => ({
  inventoryService: {
    syncRecipeConfigurationAvailability: vi.fn(),
    clearRecipeAvailabilitySignals: vi.fn(),
  },
}));

import { itemService } from "@/modules/menu/items/item.service";

const auth = {
  userId: "u1",
  tenantId: "t1",
  branchId: null,
  tenantWide: true,
  email: "owner@example.com",
  roles: [],
  permissions: ["menu:update"],
};

const existing = {
  id: "item1",
  tenantId: "t1",
  branchId: null,
  name: "Chicken Tikka",
  basePrice: "220.00",
  pricingMode: "FIXED",
  weightUnit: null,
  openPriceMin: null,
  openPriceMax: null,
  enableRecipeDeduction: false,
  variants: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  findById.mockResolvedValueOnce(existing).mockResolvedValueOnce({
    ...existing,
    variants: [{ id: "v1", name: "Half", price: "90.00" }],
  });
  update.mockResolvedValue(existing);
  setVariants.mockResolvedValue(true);
  validateVariantSync.mockResolvedValue({ ok: true });
  record.mockResolvedValue(undefined);
});

describe("item variant updates", () => {
  it("persists variants supplied by the edit-item contract and returns them", async () => {
    const result = await itemService.update(auth as never, "item1", {
      variants: [{ name: "Half", price: 90 }],
    });

    expect(setVariants).toHaveBeenCalledWith("t1", "item1", [
      { name: "Half", price: "90" },
    ]);
    expect(result.variants).toEqual([
      { id: "v1", name: "Half", price: "90.00" },
    ]);
  });

  it("preserves existing variant ids while changing name or price", async () => {
    await itemService.update(auth as never, "item1", {
      variants: [{ id: "v1", name: "Half plate", price: 95 }],
    });

    expect(setVariants).toHaveBeenCalledWith("t1", "item1", [
      { id: "v1", name: "Half plate", price: "95" },
    ]);
  });
  it("rejects deletion of a variant already used by an order or combo before updating the item", async () => {
    validateVariantSync.mockResolvedValueOnce({
      ok: false,
      reason: "VARIANT_IN_USE",
      variantId: "v1",
    });

    await expect(
      itemService.update(auth as never, "item1", { variants: [] }),
    ).rejects.toThrow(
      "This variant is already used by an order or combo and cannot be deleted",
    );

    expect(update).not.toHaveBeenCalled();
    expect(setVariants).not.toHaveBeenCalled();
  });
});
