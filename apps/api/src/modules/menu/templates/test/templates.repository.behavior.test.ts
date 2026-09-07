import { beforeEach, describe, expect, it, vi } from "vitest";
const { db, tx } = vi.hoisted(() => {
  const tx = {
    query: { menuTemplates: { findFirst: vi.fn() } },
    insert: vi.fn(),
  };
  const db = {
    query: {
      menuTemplates: { findMany: vi.fn(), findFirst: vi.fn() },
      menuCategories: { findFirst: vi.fn() },
      menuItems: { findMany: vi.fn() },
    },
    transaction: vi.fn(async (fn: any) => fn(tx)),
    delete: vi.fn(),
  };
  return { db, tx };
});
vi.mock("@/db", () => ({ db }));
import { templatesRepository } from "../templates.repository";
const returning = (rows: any[]) => ({
  returning: vi.fn().mockResolvedValue(rows),
});
beforeEach(() => {
  vi.clearAllMocks();
  db.query.menuTemplates.findMany.mockResolvedValue([]);
  db.query.menuTemplates.findFirst.mockResolvedValue(undefined);
  db.query.menuCategories.findFirst.mockResolvedValue(undefined);
  db.query.menuItems.findMany.mockResolvedValue([]);
  tx.query.menuTemplates.findFirst.mockResolvedValue(undefined);
});
describe("templates repository coverage", () => {
  it("covers reads", async () => {
    db.query.menuTemplates.findMany.mockResolvedValue([{ id: "t1" }]);
    await expect(templatesRepository.findMany("tenant")).resolves.toEqual([
      { id: "t1" },
    ]);
    db.query.menuTemplates.findFirst.mockResolvedValue({ id: "t1" });
    await expect(templatesRepository.findById("tenant", "t1")).resolves.toEqual(
      { id: "t1" },
    );
    db.query.menuCategories.findFirst.mockResolvedValue({ id: "c1" });
    await expect(
      templatesRepository.findCategory("tenant", "c1"),
    ).resolves.toEqual({ id: "c1" });
    db.query.menuItems.findMany.mockResolvedValue([{ id: "i1" }]);
    await expect(
      templatesRepository.findTenantWideCategoryItems("tenant", "c1"),
    ).resolves.toEqual([{ id: "i1" }]);
  });
  it("creates templates with and without items", async () => {
    tx.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue(returning([{ id: "tpl1" }])),
    });
    tx.query.menuTemplates.findFirst.mockResolvedValueOnce({
      id: "tpl1",
      items: [],
    });
    await expect(
      templatesRepository.createFromCategory(
        "tenant",
        { name: "Cat" },
        " Name ",
        " Desc ",
        [],
      ),
    ).resolves.toEqual({ id: "tpl1", items: [] });

    tx.insert
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue(returning([{ id: "tpl2" }])),
      })
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue(undefined) });
    tx.query.menuTemplates.findFirst.mockResolvedValueOnce({
      id: "tpl2",
      items: [{ name: "Item" }],
    });
    const item = {
      name: "Item",
      description: null,
      basePrice: "10",
      pricingMode: "FIXED",
      weightUnit: null,
      openPriceMin: null,
      openPriceMax: null,
      supportsZones: false,
      zonePricingRule: "AVERAGE",
      manualStockCount: null,
      manualStockCountUpdatedAt: null,
      taxRate: "5",
      taxMode: "EXCLUSIVE",
      foodType: "VEG",
      spiceLevel: null,
      prepTimeMinutes: null,
      hsnCode: null,
    } as any;
    await expect(
      templatesRepository.createFromCategory(
        "tenant",
        { name: "Cat" },
        "Name",
        undefined,
        [item],
      ),
    ).resolves.toMatchObject({ id: "tpl2" });
    expect(tx.insert).toHaveBeenCalledTimes(3);
  });
  it("deletes templates and returns boolean outcome", async () => {
    db.delete.mockReturnValueOnce({
      where: vi.fn().mockReturnValue(returning([])),
    });
    await expect(templatesRepository.delete("tenant", "missing")).resolves.toBe(
      false,
    );
    db.delete.mockReturnValueOnce({
      where: vi.fn().mockReturnValue(returning([{ id: "t1" }])),
    });
    await expect(templatesRepository.delete("tenant", "t1")).resolves.toBe(
      true,
    );
  });
  it("applies templates with and without items and optional branch/category names", async () => {
    tx.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue(returning([{ id: "c1" }])),
    });
    await expect(
      templatesRepository.apply(
        "tenant",
        { name: "Template", description: null, items: [] },
        {},
      ),
    ).resolves.toEqual({ category: { id: "c1" }, items: [] });

    tx.insert
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue(returning([{ id: "c2" }])),
      })
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue(returning([{ id: "i1" }])),
      });
    const item = {
      name: "Item",
      description: null,
      basePrice: "10",
      pricingMode: "FIXED",
      weightUnit: null,
      openPriceMin: null,
      openPriceMax: null,
      supportsZones: false,
      zonePricingRule: "AVERAGE",
      manualStockCount: null,
      manualStockCountUpdatedAt: null,
      taxRate: "5",
      taxMode: "EXCLUSIVE",
      foodType: "VEG",
      spiceLevel: null,
      prepTimeMinutes: null,
      hsnCode: null,
      sortOrder: 1,
    } as any;
    await expect(
      templatesRepository.apply(
        "tenant",
        { name: "Template", description: "D", items: [item] },
        { branchId: "b1", categoryName: " Copy " },
      ),
    ).resolves.toEqual({ category: { id: "c2" }, items: [{ id: "i1" }] });
  });
});
