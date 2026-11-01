import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  duplicate: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
  updateStatus: vi.fn(),
  updateAvailability: vi.fn(),
  listByStatus: vi.fn(),
}));
vi.mock("../item.service", () => ({ itemService: m }));
import { itemController } from "../item.controller";
const auth = {} as any;
const itemFixture = {
  id: "00000000-0000-4000-8000-000000000010",
  tenantId: "00000000-0000-4000-8000-000000000011",
  branchId: null,
  categoryId: "00000000-0000-4000-8000-000000000012",
  name: "Tea",
  description: null,
  basePrice: "10.00",
  manualCost: null,
  pricingMode: "FIXED",
  weightUnit: null,
  openPriceMin: null,
  openPriceMax: null,
  supportsZones: false,
  zonePricingRule: "HIGHER",
  manualStockCount: null,
  manualStockCountUpdatedAt: null,
  taxRate: "0.00",
  taxMode: null,
  imageUrl: null,
  foodType: "VEG",
  spiceLevel: null,
  sku: null,
  prepTimeMinutes: null,
  sortOrder: 0,
  hsnCode: null,
  status: "ACTIVE",
  availabilityReason: null,
  statusChangedAt: new Date("2026-01-01T00:00:00.000Z"),
  manualOverrideStatus: null,
  manualOverrideReason: null,
  manualOverrideSetBy: null,
  manualOverrideSetAt: null,
  enableRecipeDeduction: true,
  displayMode: "STANDARD",
  effectiveFrom: null,
  isPublished: true,
  publishedAt: null,
  deletedAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  isAvailable: true,
  variants: [],
  images: [],
  modifierGroupLinks: [],
  tagLinks: [],
  allergenLinks: [],
  recipeLinks: [],
  menuMemberships: [],
};
beforeEach(() => {
  vi.clearAllMocks();
  for (const fn of Object.values(m)) (fn as any).mockResolvedValue(itemFixture);
  m.remove.mockResolvedValue(undefined);
  m.listByStatus.mockResolvedValue([itemFixture]);
});
describe("item controller comprehensive coverage", () => {
  it("delegates every method and wraps responses", async () => {
    await expect(itemController.getById(auth, "i1")).resolves.toMatchObject({
      success: true,
      data: { id: itemFixture.id },
    });
    await expect(
      itemController.create(auth, { categoryId: "c", name: "N", basePrice: 1 }),
    ).resolves.toMatchObject({ success: true, data: { id: itemFixture.id } });
    await expect(itemController.update(auth, "i1", {})).resolves.toMatchObject({
      success: true,
    });
    await expect(itemController.remove(auth, "i1")).resolves.toEqual({
      success: true,
      data: null,
    });
    await expect(
      itemController.duplicate(auth, "i1", {}),
    ).resolves.toMatchObject({ success: true });
    await itemController.publish(auth, "i1");
    await itemController.unpublish(auth, "i1");
    await itemController.updateStatus(auth, "i1", "ACTIVE", undefined);
    await itemController.updateAvailability(auth, "i1", false, "r");
    await expect(
      itemController.listByStatus(auth, "ACTIVE", "c1"),
    ).resolves.toMatchObject({ success: true, data: [{ id: itemFixture.id }] });
    expect(m.listByStatus).toHaveBeenCalledWith(auth, ["ACTIVE"], "c1");
  });
});
