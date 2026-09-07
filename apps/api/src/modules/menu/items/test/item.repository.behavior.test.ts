import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  category: vi.fn(),
  itemsMany: vi.fn(),
  itemFirst: vi.fn(),
  menusFirst: vi.fn(),
  membershipsMany: vi.fn(),
  variantsMany: vi.fn(),
  comboFirst: vi.fn(),
  orderFirst: vi.fn(),
  txMenuFirst: vi.fn(),
  txItemFirst: vi.fn(),
  txVariantsMany: vi.fn(),
  txSchedulesMany: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  returning: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  where: vi.fn(),
  del: vi.fn(),
  delWhere: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/db", () => {
  const makeThenable = (result: any = undefined) => ({
    returning: m.returning,
    then: (resolve: (v: any) => any, reject: (e: any) => any) =>
      Promise.resolve(result).then(resolve, reject),
  });
  m.insert.mockImplementation(() => ({ values: m.values }));
  m.values.mockImplementation(() => makeThenable());
  m.update.mockImplementation(() => ({ set: m.set }));
  m.set.mockImplementation(() => ({ where: m.where }));
  m.where.mockImplementation(() => makeThenable());
  m.del.mockImplementation(() => ({ where: m.delWhere }));
  m.delWhere.mockImplementation(() => Promise.resolve(undefined));
  const tx: any = {
    query: {
      menus: { findFirst: m.txMenuFirst },
      menuItems: { findFirst: m.txItemFirst },
      menuItemVariants: { findMany: m.txVariantsMany },
      menuItemSchedules: { findMany: m.txSchedulesMany },
    },
    insert: m.insert,
    update: m.update,
    delete: m.del,
  };
  m.transaction.mockImplementation(async (fn: (tx: any) => unknown) => fn(tx));
  return {
    db: {
      query: {
        menuCategories: { findFirst: m.category },
        menuItems: { findMany: m.itemsMany, findFirst: m.itemFirst },
        menus: { findFirst: m.menusFirst },
        menuMemberships: { findMany: m.membershipsMany },
        menuItemVariants: { findMany: m.variantsMany },
        comboSlotOptions: { findFirst: m.comboFirst },
        orderItems: { findFirst: m.orderFirst },
      },
      insert: m.insert,
      update: m.update,
      delete: m.del,
      transaction: m.transaction,
    },
  };
});
import { itemRepository } from "../item.repository";
const detail = (o: any = {}) => ({
  id: "i1",
  status: "ACTIVE",
  manualOverrideStatus: null,
  manualStockCount: null,
  modifierGroupLinks: [],
  ...o,
});
const source = () =>
  detail({
    branchId: "b1",
    categoryId: "c1",
    name: "Src",
    description: null,
    basePrice: "10",
    manualCost: null,
    pricingMode: "FIXED",
    weightUnit: null,
    openPriceMin: null,
    openPriceMax: null,
    supportsZones: false,
    zonePricingRule: "HIGHER",
    manualStockCountUpdatedAt: null,
    taxRate: "0",
    taxMode: null,
    foodType: "VEG",
    spiceLevel: null,
    prepTimeMinutes: null,
    sortOrder: 0,
    hsnCode: null,
    enableRecipeDeduction: true,
    variants: [{ id: "v1", name: "V", price: "11" }],
    tagLinks: [{ tagId: "t1" }],
    allergenLinks: [{ allergenId: "a1" }],
    modifierGroupLinks: [{ modifierGroupId: "g1", sortOrder: 0 }],
    recipeLinks: [
      {
        inventoryItemId: "inv",
        quantityRequired: "1",
        unit: "G",
        isOptional: false,
      },
    ],
  });
beforeEach(() => {
  vi.clearAllMocks();
  m.returning.mockResolvedValue([
    {
      id: "i1",
      status: "ACTIVE",
      manualOverrideStatus: null,
      manualStockCount: null,
    },
  ]);
  m.category.mockResolvedValue({ id: "c1", branchId: "b1" });
  m.itemsMany.mockResolvedValue([]);
  m.menusFirst.mockResolvedValue({ id: "m1" });
  m.membershipsMany.mockResolvedValue([]);
  m.itemFirst.mockResolvedValue(detail());
  m.txMenuFirst.mockResolvedValue({ id: "m1" });
  m.txItemFirst.mockResolvedValue(detail());
  m.txVariantsMany.mockResolvedValue([]);
  m.txSchedulesMany.mockResolvedValue([]);
  m.variantsMany.mockResolvedValue([]);
  m.comboFirst.mockResolvedValue(undefined);
  m.orderFirst.mockResolvedValue(undefined);
});
describe("item repository comprehensive coverage", () => {
  it("finds categories, ids, menus and item read model", async () => {
    await expect(itemRepository.findCategory("t", "c")).resolves.toMatchObject({
      id: "c1",
    });
    m.itemsMany.mockResolvedValueOnce([{ id: "i1" }, { id: "i2" }]);
    await expect(itemRepository.findIdsByCategory("t", "c")).resolves.toEqual([
      "i1",
      "i2",
    ]);
    m.menusFirst.mockResolvedValueOnce(undefined);
    await expect(itemRepository.findIdsByMenu("t", "m")).resolves.toBeNull();
    m.menusFirst.mockResolvedValueOnce({ id: "m" });
    m.membershipsMany.mockResolvedValueOnce([{ menuItemId: "i1" }]);
    await expect(itemRepository.findIdsByMenu("t", "m")).resolves.toEqual([
      "i1",
    ]);
    m.itemFirst.mockResolvedValueOnce(
      detail({
        manualOverrideStatus: "OUT_OF_STOCK",
        modifierGroupLinks: [
          {
            group: {
              options: [
                {
                  computedAvailability: true,
                  manualOverrideAvailability: false,
                },
              ],
            },
          },
        ],
      }),
    );
    await expect(itemRepository.findById("t", "i")).resolves.toMatchObject({
      isAvailable: false,
    });
    m.itemFirst.mockResolvedValueOnce({
      id: "i2",
      status: "ACTIVE",
      manualOverrideStatus: null,
      manualStockCount: null,
    });
    await expect(itemRepository.findById("t", "i2")).resolves.toMatchObject({
      id: "i2",
      isAvailable: true,
    });
    m.itemFirst.mockResolvedValueOnce(undefined);
    await expect(itemRepository.findById("t", "x")).resolves.toBeUndefined();
  });
  it("creates with all relations and defaults", async () => {
    m.returning.mockResolvedValueOnce([{ id: "i1" }]);
    m.txItemFirst.mockResolvedValueOnce(detail());
    await expect(
      itemRepository.create({
        tenantId: "t",
        branchId: "b",
        categoryId: "c",
        name: "N",
        basePrice: "10",
        manualStockCount: 2,
        variants: [{ name: "V", price: "11" }],
        modifierGroupIds: ["g1"],
        tagIds: ["t1"],
        allergenIds: ["a1"],
        imageUrls: ["u"],
      }),
    ).resolves.toMatchObject({ id: "i1" });
    expect(m.values).toHaveBeenCalledWith(
      expect.objectContaining({
        pricingMode: "FIXED",
        zonePricingRule: "HIGHER",
        isPublished: true,
      }),
    );
    m.txMenuFirst.mockResolvedValueOnce(undefined);
    m.returning.mockResolvedValueOnce([{ id: "i2" }]);
    m.txItemFirst.mockResolvedValueOnce(undefined);
    await expect(
      itemRepository.create({
        tenantId: "t",
        categoryId: "c",
        name: "N",
        basePrice: "1",
        isPublished: false,
      }),
    ).resolves.toBeUndefined();
  });
  it("updates rows and status timestamps", async () => {
    m.returning.mockResolvedValueOnce([detail()]);
    await expect(
      itemRepository.update("t", "i", { name: "N", status: "OUT_OF_STOCK" }),
    ).resolves.toMatchObject({ isAvailable: true });
    m.returning.mockResolvedValueOnce([]);
    await expect(itemRepository.update("t", "i", {})).resolves.toBeUndefined();
  });
  it("validates variant synchronization", async () => {
    m.itemFirst.mockResolvedValueOnce(undefined);
    await expect(
      itemRepository.validateVariantSync("t", "i", []),
    ).resolves.toMatchObject({ ok: false, reason: "ITEM_NOT_FOUND" });
    m.itemFirst.mockResolvedValue({ id: "i" });
    m.variantsMany.mockResolvedValueOnce([{ id: "v1" }]);
    await expect(
      itemRepository.validateVariantSync("t", "i", [
        { id: "bad", name: "B", price: "1" },
      ]),
    ).resolves.toMatchObject({ reason: "FOREIGN_VARIANT" });
    m.variantsMany.mockResolvedValueOnce([{ id: "v1" }]);
    await expect(
      itemRepository.validateVariantSync("t", "i", [
        { id: "v1", name: "V", price: "1" },
      ]),
    ).resolves.toEqual({ ok: true });
    m.variantsMany.mockResolvedValueOnce([{ id: "v1" }, { id: "v2" }]);
    m.comboFirst.mockResolvedValueOnce({ id: "c", variantId: "v2" });
    await expect(
      itemRepository.validateVariantSync("t", "i", [
        { id: "v1", name: "V", price: "1" },
      ]),
    ).resolves.toMatchObject({ reason: "VARIANT_IN_USE", variantId: "v2" });
    m.variantsMany.mockResolvedValueOnce([{ id: "v1" }, { id: "v2" }]);
    m.comboFirst.mockResolvedValueOnce(undefined);
    m.orderFirst.mockResolvedValueOnce({ id: "o", variantId: "v2" });
    await expect(
      itemRepository.validateVariantSync("t", "i", [
        { id: "v1", name: "V", price: "1" },
      ]),
    ).resolves.toMatchObject({ reason: "VARIANT_IN_USE" });
    m.variantsMany.mockResolvedValueOnce([{ id: "v1" }, { id: "v2" }]);
    m.comboFirst.mockResolvedValueOnce(undefined);
    m.orderFirst.mockResolvedValueOnce(undefined);
    await expect(
      itemRepository.validateVariantSync("t", "i", [
        { id: "v1", name: "V", price: "1" },
      ]),
    ).resolves.toEqual({ ok: true });
  });
  it("sets variants for missing/foreign/update/create/remove", async () => {
    m.txItemFirst.mockResolvedValueOnce(undefined);
    await expect(itemRepository.setVariants("t", "i", [])).resolves.toBe(false);
    m.txItemFirst.mockResolvedValue({ id: "i" });
    m.txVariantsMany.mockResolvedValueOnce([{ id: "v1" }]);
    await expect(
      itemRepository.setVariants("t", "i", [
        { id: "bad", name: "B", price: "1" },
      ]),
    ).resolves.toBe(false);
    m.txVariantsMany.mockResolvedValueOnce([{ id: "v1" }, { id: "v2" }]);
    await expect(
      itemRepository.setVariants("t", "i", [
        { id: "v1", name: "V", price: "2" },
        { name: "New", price: "3" },
      ]),
    ).resolves.toBe(true);
    expect(m.del).toHaveBeenCalled();
  });
  it("duplicates missing and rich items including schedules", async () => {
    m.itemFirst.mockResolvedValueOnce(undefined);
    await expect(itemRepository.duplicate("t", "x")).resolves.toBeUndefined();
    m.itemFirst.mockResolvedValueOnce(source());
    m.returning.mockResolvedValueOnce([{ id: "copy" }]);
    m.txSchedulesMany.mockResolvedValueOnce([
      {
        branchId: "b",
        scheduleType: "DAILY",
        startTime: "09",
        endTime: "10",
        dayOfWeek: null,
        startDate: null,
        endDate: null,
        holidayName: null,
        statusDuringPeriod: "ACTIVE",
        isActive: true,
      },
    ]);
    m.txItemFirst.mockResolvedValueOnce(detail({ id: "copy" }));
    await expect(
      itemRepository.duplicate("t", "i", {
        name: " Copy ",
        copyRecipes: true,
        copySchedules: true,
        copyModifiers: true,
      }),
    ).resolves.toMatchObject({ id: "copy" });
    m.itemFirst.mockResolvedValueOnce(source());
    m.returning.mockResolvedValueOnce([{ id: "copy2" }]);
    m.txItemFirst.mockResolvedValueOnce(detail({ id: "copy2" }));
    await expect(itemRepository.duplicate("t", "i")).resolves.toMatchObject({
      id: "copy2",
    });
    m.itemFirst.mockResolvedValueOnce(source());
    m.returning.mockResolvedValueOnce([{ id: "copy3" }]);
    m.txSchedulesMany.mockResolvedValueOnce([]);
    m.txItemFirst.mockResolvedValueOnce(undefined);
    await expect(
      itemRepository.duplicate("t", "i", {
        copyModifiers: false,
        copyRecipes: false,
        copySchedules: true,
      }),
    ).resolves.toBeUndefined();
  });
  it("updates status and lists by status", async () => {
    m.returning.mockResolvedValueOnce([detail({ status: "OUT_OF_STOCK" })]);
    await expect(
      itemRepository.updateStatus("t", "i", "OUT_OF_STOCK", "r"),
    ).resolves.toMatchObject({ isAvailable: false });
    m.returning.mockResolvedValueOnce([]);
    await expect(
      itemRepository.updateStatus("t", "i", "ACTIVE"),
    ).resolves.toBeUndefined();
    m.itemsMany.mockResolvedValueOnce([detail()]);
    await expect(
      itemRepository.findByStatus("t", "b", ["ACTIVE"], "c"),
    ).resolves.toHaveLength(1);
    const cfg = m.itemsMany.mock.calls.at(-1)?.[0];
    const asc = vi.fn((x: any) => x);
    expect(cfg.orderBy({ sortOrder: "s" }, { asc })).toEqual(["s"]);
    m.itemsMany.mockResolvedValueOnce([]);
    await itemRepository.findByStatus("t", null, ["ACTIVE"]);
  });
  it("sets relation collections only for owned items", async () => {
    m.itemFirst.mockResolvedValue({ id: "i" });
    await itemRepository.setTags("t", "i", ["t1"]);
    await itemRepository.setTags("t", "i", []);
    await itemRepository.setAllergens("t", "i", ["a1"]);
    await itemRepository.setAllergens("t", "i", []);
    await itemRepository.setModifierGroups("t", "i", ["g1"]);
    await itemRepository.setModifierGroups("t", "i", []);
    await itemRepository.setImages("t", "i", ["u"]);
    await itemRepository.setImages("t", "i", []);
    m.itemFirst.mockResolvedValue(undefined);
    await itemRepository.setTags("t", "i", ["t"]);
    await itemRepository.setAllergens("t", "i", ["a"]);
    await itemRepository.setModifierGroups("t", "i", ["g"]);
    await itemRepository.setImages("t", "i", ["u"]);
  });
  it("soft deletes, publishes and unpublishes", async () => {
    await itemRepository.softDelete("t", "i");
    m.returning.mockResolvedValueOnce([{ id: "i" }]);
    await expect(itemRepository.publish("t", "i")).resolves.toEqual({
      id: "i",
    });
    m.returning.mockResolvedValueOnce([]);
    await expect(itemRepository.publish("t", "i")).resolves.toBeUndefined();
    m.returning.mockResolvedValueOnce([{ id: "i" }]);
    await expect(itemRepository.unpublish("t", "i")).resolves.toEqual({
      id: "i",
    });
    m.returning.mockResolvedValueOnce([]);
    await expect(itemRepository.unpublish("t", "i")).resolves.toBeUndefined();
  });
});
