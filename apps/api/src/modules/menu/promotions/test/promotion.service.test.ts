import { beforeEach, describe, expect, it, vi } from "vitest";
const { create, list, findById, update, remove, stats, findItem, findCategory } =
  vi.hoisted(() => ({
    create: vi.fn(),
    list: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    stats: vi.fn(),
    findItem: vi.fn(),
    findCategory: vi.fn(),
  }));
vi.mock("../promotion.repository", () => ({
  promotionRepository: {
    create,
    list,
    findById,
    update,
    remove,
    stats,
  },
}));
vi.mock("../../change-log/menu-change-log", () => ({
  menuChangeLog: { record: vi.fn() },
  buildDiff: vi.fn(() => ({})),
}));
vi.mock("../../items/item.repository", () => ({
  itemRepository: { findById: findItem, findCategory },
}));
vi.mock("../../../../core/auth", async () => {
  const actual = await vi.importActual<typeof import("../../../../core/auth")>(
    "../../../../core/auth",
  );
  return { ...actual, requirePermission: vi.fn() };
});
import { promotionService } from "@/modules/menu/promotions/promotion.service";
import type { AuthContext } from "@/core/auth";
const auth: AuthContext = {
  tenantId: "tenant",
  userId: "user",
  membershipId: "membership",
  branchId: null,
  email: "user@example.com",
  roles: [],
  permissions: ["menu:update", "menu:read"],
};
describe("promotionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findItem.mockResolvedValue({ id: "item-a", branchId: null });
    findCategory.mockResolvedValue({ id: "cat-a", branchId: null });
  });
  it("normalizes coupon codes and persists percentage promotions", async () => {
    create.mockImplementation(async (input) => ({ ...input, id: "p1" }));
    const result = await promotionService.create(auth, {
      name: "Summer",
      ruleType: "PERCENTAGE",
      scope: "ORDER",
      value: 20,
      couponCode: " save20 ",
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant",
        couponCode: "SAVE20",
        value: "20.00",
      }),
    );
    expect(result.id).toBe("p1");
  });
  it("rejects invalid scope targets and percentages above 100", async () => {
    await expect(
      promotionService.create(auth, {
        name: "bad",
        ruleType: "PERCENTAGE",
        scope: "ORDER",
        value: 101,
      }),
    ).rejects.toThrow();
    await expect(
      promotionService.create(auth, {
        name: "bad",
        ruleType: "FIXED_AMOUNT",
        scope: "ITEM",
        value: 10,
      }),
    ).rejects.toThrow();
  });
  it("rejects item/category targets that do not belong to the authenticated tenant", async () => {
    findItem.mockResolvedValueOnce(undefined);
    await expect(
      promotionService.create(auth, {
        name: "foreign item",
        ruleType: "FIXED_AMOUNT",
        scope: "ITEM",
        value: 10,
        scopeMenuItemId: "foreign-item",
      }),
    ).rejects.toThrow(/does not belong to this tenant/i);

    findCategory.mockResolvedValueOnce(undefined);
    await expect(
      promotionService.create(auth, {
        name: "foreign category",
        ruleType: "PERCENTAGE",
        scope: "CATEGORY",
        value: 10,
        scopeCategoryId: "foreign-category",
      }),
    ).rejects.toThrow(/does not belong to this tenant/i);
  });

  it("rejects BOGO configurations that also use the generic promotion scope", async () => {
    await expect(
      promotionService.create(auth, {
        name: "Bad scoped BOGO",
        ruleType: "BOGO",
        scope: "ITEM",
        scopeMenuItemId: "item-a",
        triggerMenuItemId: "item-a",
        rewardDiscountPercent: 100,
        triggerQuantity: 1,
        rewardQuantity: 1,
      }),
    ).rejects.toThrow(/must use ORDER scope/i);
  });

  it("validates and persists BOGO pairing fields without a flat value", async () => {
    create.mockImplementation(async (input) => ({ ...input, id: "bogo" }));
    await promotionService.create(auth, {
      name: "Buy 2 get 1",
      ruleType: "BOGO",
      scope: "ORDER",
      triggerMenuItemId: "item-a",
      rewardDiscountPercent: 100,
      triggerQuantity: 2,
      rewardQuantity: 1,
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant",
        ruleType: "BOGO",
        value: null,
        triggerMenuItemId: "item-a",
        rewardDiscountPercent: "100.00",
        triggerQuantity: 2,
        rewardQuantity: 1,
      }),
    );
  });
});


describe("promotionService complete coverage", () => {
  beforeEach(() => {
    findItem.mockResolvedValue({ id: "item-a", branchId: null });
    findCategory.mockResolvedValue({ id: "cat-a", branchId: null });
    list.mockResolvedValue([]);
    stats.mockResolvedValue({ uses: 2, discountAmount: "5.00" });
  });

  it("covers list and stats", async () => {
    list.mockResolvedValue([{ id: "p1" }]);
    await expect(promotionService.list(auth)).resolves.toEqual([{ id: "p1" }]);
    await expect(promotionService.stats(auth, "p1")).resolves.toEqual({ uses: 2, discountAmount: "5.00" });
  });

  it("rejects fixed, BOGO, scope, and date validation failures", async () => {
    await expect(promotionService.create(auth, { name: "x", ruleType: "FIXED_AMOUNT", scope: "ORDER", value: 0 })).rejects.toThrow(/greater than 0/i);
    await expect(promotionService.create(auth, { name: "x", ruleType: "BOGO", scope: "ORDER", rewardDiscountPercent: 100, triggerQuantity: 1, rewardQuantity: 1 })).rejects.toThrow(/exactly one trigger/i);
    await expect(promotionService.create(auth, { name: "x", ruleType: "BOGO", scope: "ORDER", triggerMenuItemId: "item-a", rewardMenuItemId: "item-a", rewardCategoryId: "cat-a", rewardDiscountPercent: 100, triggerQuantity: 1, rewardQuantity: 1 })).rejects.toThrow(/at most one/i);
    await expect(promotionService.create(auth, { name: "x", ruleType: "BOGO", scope: "ORDER", triggerMenuItemId: "item-a", rewardDiscountPercent: 0, triggerQuantity: 1, rewardQuantity: 1 })).rejects.toThrow(/reward discount/i);
    await expect(promotionService.create(auth, { name: "x", ruleType: "BOGO", scope: "ORDER", triggerMenuItemId: "item-a", rewardDiscountPercent: 100, triggerQuantity: 0, rewardQuantity: 1 })).rejects.toThrow(/quantities/i);
    await expect(promotionService.create(auth, { name: "x", ruleType: "PERCENTAGE", scope: "ORDER", scopeCategoryId: "cat-a", value: 10 })).rejects.toThrow(/cannot target/i);
    await expect(promotionService.create(auth, { name: "x", ruleType: "PERCENTAGE", scope: "CATEGORY", value: 10 })).rejects.toThrow(/requires exactly one category/i);
    await expect(promotionService.create(auth, { name: "x", ruleType: "PERCENTAGE", scope: "ITEM", value: 10 })).rejects.toThrow(/requires exactly one item/i);
    await expect(promotionService.create(auth, { name: "x", ruleType: "PERCENTAGE", scope: "ORDER", value: 10, startDate: "2026-09-06", endDate: "2026-09-05" })).rejects.toThrow(/start date/i);
  });

  it("validates all BOGO item/category targets and persists defaults", async () => {
    create.mockImplementation(async (input) => ({ ...input, id: "p1" }));
    await promotionService.create(auth, {
      name: " Bogo ", ruleType: "BOGO", scope: "ORDER",
      triggerCategoryId: "cat-a", rewardMenuItemId: "item-a", rewardDiscountPercent: 50,
      triggerQuantity: 2, rewardQuantity: 1, couponCode: null,
    });
    expect(findCategory).toHaveBeenCalledWith("tenant", "cat-a");
    expect(findItem).toHaveBeenCalledWith("tenant", "item-a");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: "Bogo", rewardDiscountPercent: "50.00", stackableWithLoyalty: true, isActive: true }));
  });

  it("covers preview empty-items validation after branch selection", async () => {
    await expect(promotionService.preview({ ...auth, branchId: "b1" }, {
      promotion: { name: "P", ruleType: "PERCENTAGE", scope: "ORDER", value: 10 },
      items: [],
    })).rejects.toThrow(/at least one menu item/i);
  });

  it("covers update fallback branches for persisted optional fields", async () => {
    const existingCategory = {
      id: "pc", tenantId: "tenant", name: "Existing", ruleType: "PERCENTAGE", scope: "CATEGORY",
      scopeCategoryId: "cat-a", scopeMenuItemId: null, value: "10.00", couponCode: "SAVE",
      startDate: "2026-09-01", endDate: "2026-09-30", startTime: "10:00", endTime: "12:00",
      maxUsesTotal: 5, maxUsesPerCustomer: 2, triggerMenuItemId: null, triggerCategoryId: null,
      rewardMenuItemId: null, rewardCategoryId: null, rewardDiscountPercent: null,
      triggerQuantity: null, rewardQuantity: null, stackableWithLoyalty: true, isActive: true,
    };
    findById.mockResolvedValueOnce(existingCategory);
    update.mockResolvedValueOnce({ ...existingCategory, name: "Keep fallbacks" });
    await expect(promotionService.update(auth, "pc", { name: "Keep fallbacks" })).resolves.toMatchObject({ name: "Keep fallbacks" });
    expect(update).toHaveBeenLastCalledWith("tenant", "pc", expect.objectContaining({
      scopeCategoryId: "cat-a", couponCode: "SAVE", startDate: "2026-09-01", endDate: "2026-09-30", startTime: "10:00", endTime: "12:00", maxUsesTotal: 5, maxUsesPerCustomer: 2,
    }));

    const existingBogo = {
      id: "pb", tenantId: "tenant", name: "Bogo", ruleType: "BOGO", scope: "ORDER",
      scopeCategoryId: null, scopeMenuItemId: null, value: null, couponCode: null, startDate: null, endDate: null, startTime: null, endTime: null,
      maxUsesTotal: null, maxUsesPerCustomer: null, triggerMenuItemId: "item-a", triggerCategoryId: null,
      rewardMenuItemId: null, rewardCategoryId: "cat-a", rewardDiscountPercent: "50.00", triggerQuantity: 2, rewardQuantity: 1,
      stackableWithLoyalty: false, isActive: true,
    };
    findById.mockResolvedValueOnce(existingBogo);
    update.mockResolvedValueOnce(existingBogo);
    await expect(promotionService.update(auth, "pb", { name: "Bogo kept" })).resolves.toMatchObject({ id: "pb" });
    expect(update).toHaveBeenLastCalledWith("tenant", "pb", expect.objectContaining({
      triggerMenuItemId: "item-a", rewardCategoryId: "cat-a", rewardDiscountPercent: "50.00", triggerQuantity: 2, rewardQuantity: 1, stackableWithLoyalty: false,
    }));
  });

  it("covers explicit update branches for scope and BOGO target fields", async () => {
    const existingPercent = {
      id: "px", tenantId: "tenant", name: "Percent", ruleType: "PERCENTAGE", scope: "CATEGORY",
      scopeCategoryId: "cat-a", scopeMenuItemId: null, value: "10.00", couponCode: null, startDate: null, endDate: null, startTime: null, endTime: null,
      maxUsesTotal: null, maxUsesPerCustomer: null, triggerMenuItemId: null, triggerCategoryId: null, rewardMenuItemId: null, rewardCategoryId: null, rewardDiscountPercent: null, triggerQuantity: null, rewardQuantity: null, stackableWithLoyalty: true, isActive: true,
    };
    findById.mockResolvedValueOnce(existingPercent);
    update.mockResolvedValueOnce({ ...existingPercent, scope: "ITEM", scopeCategoryId: null, scopeMenuItemId: "item-a" });
    await expect(promotionService.update(auth, "px", { scope: "ITEM", scopeCategoryId: null, scopeMenuItemId: "item-a" })).resolves.toMatchObject({ scope: "ITEM" });

    const existingBogo = {
      id: "pbx", tenantId: "tenant", name: "Bogo", ruleType: "BOGO", scope: "ORDER", scopeCategoryId: null, scopeMenuItemId: null, value: null, couponCode: null, startDate: null, endDate: null, startTime: null, endTime: null,
      maxUsesTotal: null, maxUsesPerCustomer: null, triggerMenuItemId: "item-a", triggerCategoryId: null, rewardMenuItemId: null, rewardCategoryId: "cat-a", rewardDiscountPercent: "50.00", triggerQuantity: 2, rewardQuantity: 1, stackableWithLoyalty: true, isActive: true,
    };
    findById.mockResolvedValueOnce(existingBogo);
    update.mockResolvedValueOnce(existingBogo);
    await expect(promotionService.update(auth, "pbx", {
      triggerMenuItemId: null, triggerCategoryId: "cat-a", rewardMenuItemId: "item-a", rewardCategoryId: null, rewardDiscountPercent: 75, triggerQuantity: 3, rewardQuantity: 2,
    })).resolves.toMatchObject({ id: "pbx" });
  });

  it("covers remaining update fallback statements", async () => {
    const existingItem = {
      id: "pi", tenantId: "tenant", name: "Item", ruleType: "PERCENTAGE", scope: "ITEM", scopeCategoryId: null, scopeMenuItemId: "item-a", value: "10.00", couponCode: null, startDate: null, endDate: null, startTime: null, endTime: null, maxUsesTotal: null, maxUsesPerCustomer: null, triggerMenuItemId: null, triggerCategoryId: null, rewardMenuItemId: null, rewardCategoryId: null, rewardDiscountPercent: null, triggerQuantity: null, rewardQuantity: null, stackableWithLoyalty: true, isActive: true,
    };
    findById.mockResolvedValueOnce(existingItem); update.mockResolvedValueOnce(existingItem);
    await expect(promotionService.update(auth, "pi", { name: "Item kept" })).resolves.toMatchObject({ id: "pi" });

    const existingBogo = {
      id: "pbf", tenantId: "tenant", name: "Bogo fallback", ruleType: "BOGO", scope: "ORDER", scopeCategoryId: null, scopeMenuItemId: null, value: null, couponCode: null, startDate: null, endDate: null, startTime: null, endTime: null, maxUsesTotal: null, maxUsesPerCustomer: null, triggerMenuItemId: null, triggerCategoryId: "cat-a", rewardMenuItemId: "item-a", rewardCategoryId: null, rewardDiscountPercent: "50.00", triggerQuantity: 2, rewardQuantity: 1, stackableWithLoyalty: true, isActive: true,
    };
    findById.mockResolvedValueOnce(existingBogo); update.mockResolvedValueOnce(existingBogo);
    await expect(promotionService.update(auth, "pbf", { name: "Bogo fallback kept" })).resolves.toMatchObject({ id: "pbf" });
  });

  it("covers update missing, successful merge, failed update, remove and missing remove", async () => {
    findById.mockResolvedValueOnce(undefined);
    await expect(promotionService.update(auth, "missing", { name: "x" })).rejects.toThrow(/not found/i);

    const existing = {
      id: "p1", tenantId: "tenant", name: "Old", ruleType: "PERCENTAGE", scope: "ORDER",
      scopeCategoryId: null, scopeMenuItemId: null, value: "10.00", couponCode: "SAVE",
      startDate: "2026-09-01", endDate: "2026-09-30", startTime: "10:00", endTime: "12:00",
      maxUsesTotal: 5, maxUsesPerCustomer: 1, triggerMenuItemId: null, triggerCategoryId: null,
      rewardMenuItemId: null, rewardCategoryId: null, rewardDiscountPercent: null,
      triggerQuantity: null, rewardQuantity: null, stackableWithLoyalty: true, isActive: true,
    };
    findById.mockResolvedValue(existing);
    update.mockResolvedValueOnce({ ...existing, name: "New" });
    await expect(promotionService.update(auth, "p1", { name: "New", value: 20, couponCode: null, startDate: null, endDate: null, startTime: null, endTime: null, maxUsesTotal: null, maxUsesPerCustomer: null, stackableWithLoyalty: false, isActive: false })).resolves.toMatchObject({ name: "New" });
    expect(update).toHaveBeenCalledWith("tenant", "p1", expect.objectContaining({ name: "New", value: "20.00", couponCode: null, isActive: false }));

    update.mockResolvedValueOnce(undefined);
    await expect(promotionService.update(auth, "p1", { value: 15 })).rejects.toThrow(/not found/i);

    findById.mockResolvedValueOnce(undefined);
    await expect(promotionService.remove(auth, "missing")).resolves.toBeUndefined();
    findById.mockResolvedValueOnce(existing);
    remove.mockResolvedValueOnce(undefined);
    await expect(promotionService.remove(auth, "p1")).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledWith("tenant", "p1");
  });
});
