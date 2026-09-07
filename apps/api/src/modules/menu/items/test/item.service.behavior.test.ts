import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  findById: vi.fn(),
  findCategory: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  validateVariantSync: vi.fn(),
  setTags: vi.fn(),
  setAllergens: vi.fn(),
  setModifierGroups: vi.fn(),
  setImages: vi.fn(),
  setVariants: vi.fn(),
  softDelete: vi.fn(),
  duplicate: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
  updateStatus: vi.fn(),
  findByStatus: vi.fn(),
  requirePermission: vi.fn(),
  resolveMenuBranch: vi.fn(),
  assertMenuResourceBranch: vi.fn(),
  findOwnedTagIds: vi.fn(),
  findOwnedModifierGroupIds: vi.fn(),
  record: vi.fn(),
  buildDiff: vi.fn(),
  syncRecipeConfigurationAvailability: vi.fn(),
  clearRecipeAvailabilitySignals: vi.fn(),
}));
vi.mock("@/core/auth", () => ({ requirePermission: m.requirePermission }));
vi.mock("@/modules/menu/menu-authorization", () => ({
  resolveMenuBranch: m.resolveMenuBranch,
  assertMenuResourceBranch: m.assertMenuResourceBranch,
}));
vi.mock("../item.repository", () => ({
  itemRepository: {
    findById: m.findById,
    findCategory: m.findCategory,
    create: m.create,
    update: m.update,
    validateVariantSync: m.validateVariantSync,
    setTags: m.setTags,
    setAllergens: m.setAllergens,
    setModifierGroups: m.setModifierGroups,
    setImages: m.setImages,
    setVariants: m.setVariants,
    softDelete: m.softDelete,
    duplicate: m.duplicate,
    publish: m.publish,
    unpublish: m.unpublish,
    updateStatus: m.updateStatus,
    findByStatus: m.findByStatus,
  },
}));
vi.mock("@/modules/menu/modifiers/modifier.repository", () => ({
  modifierRepository: {
    findOwnedTagIds: m.findOwnedTagIds,
    findOwnedModifierGroupIds: m.findOwnedModifierGroupIds,
  },
}));
vi.mock("@/modules/menu/change-log/menu-change-log", () => ({
  buildDiff: m.buildDiff,
  menuChangeLog: { record: m.record },
}));
vi.mock("@/modules/inventory/inventory.service", () => ({
  inventoryService: {
    syncRecipeConfigurationAvailability: m.syncRecipeConfigurationAvailability,
    clearRecipeAvailabilitySignals: m.clearRecipeAvailabilitySignals,
  },
}));
import { itemService } from "../item.service";
const auth: any = { tenantId: "t1", branchId: "b1", userId: "u1" };
const item = (o: any = {}) => ({
  id: "i1",
  branchId: "b1",
  enableRecipeDeduction: true,
  pricingMode: "FIXED",
  weightUnit: null,
  openPriceMin: null,
  openPriceMax: null,
  ...o,
});
beforeEach(() => {
  vi.clearAllMocks();
  m.resolveMenuBranch.mockReturnValue("b1");
  m.findById.mockResolvedValue(item());
  m.findCategory.mockResolvedValue({ id: "c1", branchId: "b1" });
  m.findOwnedTagIds.mockResolvedValue(new Set(["t1"]));
  m.findOwnedModifierGroupIds.mockResolvedValue(new Set(["g1"]));
  m.create.mockResolvedValue(item());
  m.update.mockResolvedValue(item());
  m.validateVariantSync.mockResolvedValue({ ok: true });
  m.setVariants.mockResolvedValue(true);
  m.duplicate.mockResolvedValue(item({ id: "i2" }));
  m.publish.mockResolvedValue(item());
  m.unpublish.mockResolvedValue(item());
  m.updateStatus.mockResolvedValue(item());
  m.findByStatus.mockResolvedValue([item()]);
  m.buildDiff.mockReturnValue({});
});
describe("item service comprehensive coverage", () => {
  it("gets item and rejects missing", async () => {
    await expect(itemService.getById(auth, "i1")).resolves.toMatchObject({
      id: "i1",
    });
    m.findById.mockResolvedValueOnce(undefined);
    await expect(itemService.getById(auth, "x")).rejects.toThrow();
  });
  it("creates normalized item with references", async () => {
    await itemService.create(auth, {
      categoryId: "c1",
      name: "N",
      basePrice: 10,
      manualCost: 4,
      taxRate: 5,
      effectiveFrom: "2026-01-01",
      variants: [{ name: "V", price: 12 }],
      tagIds: ["t1"],
      modifierGroupIds: ["g1"],
      openPriceMin: 1,
      openPriceMax: 2,
    });
    expect(m.create).toHaveBeenCalledWith(
      expect.objectContaining({
        basePrice: "10",
        manualCost: "4",
        taxRate: "5",
        branchId: "b1",
        variants: [{ name: "V", price: "12" }],
      }),
    );
    m.resolveMenuBranch.mockReturnValueOnce(null);
    m.findCategory.mockResolvedValueOnce({ id: "c1", branchId: null });
    await itemService.create(
      { ...auth, branchId: null },
      {
        categoryId: "c1",
        name: "Shared",
        basePrice: 1,
        modifierGroupIds: ["g1"],
      },
    );
    expect(m.findOwnedModifierGroupIds).toHaveBeenLastCalledWith("t1", null, [
      "g1",
    ]);
    m.resolveMenuBranch.mockReturnValueOnce("b1");
    m.findCategory.mockResolvedValueOnce({ id: "c1", branchId: "b1" });
    await itemService.create(auth, {
      categoryId: "c1",
      name: "Weighted",
      basePrice: 2,
      pricingMode: "WEIGHT_BASED",
      weightUnit: "KG",
    });
  });
  it("covers create validation failures", async () => {
    m.findCategory.mockResolvedValueOnce(undefined);
    await expect(
      itemService.create(auth, { categoryId: "x", name: "N", basePrice: 1 }),
    ).rejects.toThrow();
    m.findCategory.mockResolvedValueOnce({ id: "c", branchId: "b2" });
    await expect(
      itemService.create(auth, { categoryId: "c", name: "N", basePrice: 1 }),
    ).rejects.toThrow("Category branch");
    m.findCategory.mockResolvedValue({ id: "c", branchId: "b1" });
    await expect(
      itemService.create(auth, {
        categoryId: "c",
        name: "N",
        basePrice: 1,
        pricingMode: "WEIGHT_BASED",
      }),
    ).rejects.toThrow("weight unit");
    await expect(
      itemService.create(auth, {
        categoryId: "c",
        name: "N",
        basePrice: 1,
        openPriceMin: 3,
        openPriceMax: 2,
      }),
    ).rejects.toThrow("minimum");
    await expect(
      itemService.create(auth, {
        categoryId: "c",
        name: "N",
        basePrice: 1,
        manualStockCount: -1,
      }),
    ).rejects.toThrow("stock count");
    await expect(
      itemService.create(auth, {
        categoryId: "c",
        name: "N",
        basePrice: 1,
        manualStockCount: 1.2,
      }),
    ).rejects.toThrow("stock count");
    m.findOwnedTagIds.mockResolvedValueOnce(new Set());
    await expect(
      itemService.create(auth, {
        categoryId: "c",
        name: "N",
        basePrice: 1,
        tagIds: ["bad"],
      }),
    ).rejects.toThrow("tags");
    m.findOwnedModifierGroupIds.mockResolvedValueOnce(new Set());
    await expect(
      itemService.create(auth, {
        categoryId: "c",
        name: "N",
        basePrice: 1,
        modifierGroupIds: ["bad"],
      }),
    ).rejects.toThrow("modifier groups");
    m.create.mockResolvedValueOnce(undefined);
    await expect(
      itemService.create(auth, { categoryId: "c", name: "N", basePrice: 1 }),
    ).rejects.toThrow("could not be created");
  });
  it("updates all relations and recipe signals", async () => {
    m.findById
      .mockResolvedValueOnce(item({ enableRecipeDeduction: false }))
      .mockResolvedValueOnce(item({ enableRecipeDeduction: true }));
    await itemService.update(auth, "i1", {
      basePrice: 20,
      manualCost: null,
      taxRate: 7,
      openPriceMin: null,
      openPriceMax: 30,
      manualStockCount: 2,
      effectiveFrom: null,
      tagIds: ["t1"],
      allergenIds: ["a1"],
      modifierGroupIds: ["g1"],
      imageUrls: ["u"],
      variants: [{ id: "v1", name: "V", price: 5 }],
    });
    expect(m.setTags).toHaveBeenCalled();
    expect(m.setAllergens).toHaveBeenCalled();
    expect(m.setModifierGroups).toHaveBeenCalled();
    expect(m.setImages).toHaveBeenCalled();
    expect(m.setVariants).toHaveBeenCalled();
    expect(m.syncRecipeConfigurationAvailability).toHaveBeenCalled();
    m.findById.mockResolvedValueOnce(item()).mockResolvedValueOnce(item());
    await itemService.update(auth, "i1", {
      manualCost: 3,
      openPriceMin: 1,
      openPriceMax: 9,
      effectiveFrom: "2026-02-03",
      taxRate: 8,
      basePrice: 22,
      manualStockCount: null,
    });
    expect(m.update).toHaveBeenLastCalledWith(
      "t1",
      "i1",
      expect.objectContaining({
        manualCost: "3",
        openPriceMin: "1",
        openPriceMax: "9",
        taxRate: "8",
        basePrice: "22",
        effectiveFrom: expect.any(Date),
        manualStockCountUpdatedAt: expect.any(Date),
      }),
    );
    m.findById
      .mockResolvedValueOnce(
        item({
          openPriceMin: "2",
          openPriceMax: "8",
          pricingMode: "WEIGHT_BASED",
          weightUnit: "KG",
        }),
      )
      .mockResolvedValueOnce(
        item({
          openPriceMin: "2",
          openPriceMax: "8",
          pricingMode: "WEIGHT_BASED",
          weightUnit: "KG",
        }),
      );
    await itemService.update(auth, "i1", { name: "Fallback" });
    m.findById.mockResolvedValueOnce(item()).mockResolvedValueOnce(item());
    await itemService.update(auth, "i1", { openPriceMax: null });
    m.findById.mockResolvedValueOnce(item()).mockResolvedValueOnce(item());
    await itemService.update(auth, "i1", {
      variants: [{ name: "New", price: 4 }],
    });
    m.findById
      .mockResolvedValueOnce(item({ enableRecipeDeduction: true }))
      .mockResolvedValueOnce(item({ enableRecipeDeduction: false }));
    await itemService.update(auth, "i1", {});
    expect(m.clearRecipeAvailabilitySignals).toHaveBeenCalled();
  });
  it("covers update failures and variant validation", async () => {
    m.findById.mockResolvedValueOnce(undefined);
    await expect(itemService.update(auth, "x", {})).rejects.toThrow();
    m.findById.mockResolvedValue(item());
    m.validateVariantSync.mockResolvedValueOnce({
      ok: false,
      reason: "VARIANT_IN_USE",
      variantId: "v1",
    });
    await expect(
      itemService.update(auth, "i1", { variants: [] }),
    ).rejects.toThrow("already used");
    m.validateVariantSync.mockResolvedValueOnce({
      ok: false,
      reason: "FOREIGN_VARIANT",
    });
    await expect(
      itemService.update(auth, "i1", { variants: [] }),
    ).rejects.toThrow("do not belong");
    m.update.mockResolvedValueOnce(undefined);
    await expect(itemService.update(auth, "i1", {})).rejects.toThrow();
    m.update.mockResolvedValue(item());
    m.validateVariantSync.mockResolvedValue({ ok: true });
    m.setVariants.mockResolvedValueOnce(false);
    await expect(
      itemService.update(auth, "i1", { variants: [] }),
    ).rejects.toThrow("do not belong");
    m.setVariants.mockResolvedValue(true);
    m.findById.mockResolvedValueOnce(item()).mockResolvedValueOnce(undefined);
    await expect(itemService.update(auth, "i1", {})).rejects.toThrow();
  });
  it("removes, duplicates, publishes, unpublishes", async () => {
    await itemService.remove(auth, "i1");
    m.findById.mockResolvedValueOnce(undefined);
    await expect(itemService.remove(auth, "x")).resolves.toBeUndefined();
    m.findById.mockResolvedValue(item());
    await expect(itemService.duplicate(auth, "i1", {})).resolves.toMatchObject({
      id: "i2",
    });
    m.duplicate.mockResolvedValueOnce(undefined);
    await expect(itemService.duplicate(auth, "i1", {})).rejects.toThrow();
    m.findById.mockResolvedValueOnce(undefined);
    await expect(itemService.duplicate(auth, "x", {})).rejects.toThrow();
    m.findById.mockResolvedValue(item());
    await itemService.publish(auth, "i1");
    m.publish.mockResolvedValueOnce(undefined);
    await expect(itemService.publish(auth, "i1")).rejects.toThrow();
    m.findById.mockResolvedValueOnce(undefined);
    await expect(itemService.publish(auth, "x")).rejects.toThrow();
    m.findById.mockResolvedValue(item());
    await itemService.unpublish(auth, "i1");
    m.unpublish.mockResolvedValueOnce(undefined);
    await expect(itemService.unpublish(auth, "i1")).rejects.toThrow();
    m.findById.mockResolvedValueOnce(undefined);
    await expect(itemService.unpublish(auth, "x")).rejects.toThrow();
  });
  it("updates status and availability and lists", async () => {
    await itemService.updateStatus(auth, "i1", "ACTIVE", "r");
    await itemService.updateAvailability(auth, "i1", true);
    await itemService.updateAvailability(auth, "i1", false, "r");
    m.updateStatus.mockResolvedValueOnce(undefined);
    await expect(
      itemService.updateStatus(auth, "i1", "ACTIVE"),
    ).rejects.toThrow();
    m.findById.mockResolvedValueOnce(undefined);
    await expect(
      itemService.updateStatus(auth, "x", "ACTIVE"),
    ).rejects.toThrow();
    m.findById.mockResolvedValue(item());
    m.updateStatus.mockResolvedValueOnce(undefined);
    await expect(
      itemService.updateAvailability(auth, "i1", true),
    ).rejects.toThrow();
    m.findById.mockResolvedValueOnce(undefined);
    await expect(
      itemService.updateAvailability(auth, "x", true),
    ).rejects.toThrow();
    m.findById.mockResolvedValue(item());
    await expect(
      itemService.listByStatus(auth, ["ACTIVE"], "c1"),
    ).resolves.toHaveLength(1);
  });
});
