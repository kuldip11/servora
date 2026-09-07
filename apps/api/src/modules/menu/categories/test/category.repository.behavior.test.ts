import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  catFindFirst: vi.fn(),
  catFindMany: vi.fn(),
  itemFindMany: vi.fn(),
  insertValues: vi.fn(),
  insertReturning: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
  updateReturning: vi.fn(),
  itemAvail: vi.fn((x: any) => ({ ...x, effective: true })),
  modAvail: vi.fn((x: any) => ({ ...x, effective: true })),
}));
vi.mock("../../../../db", () => ({
  db: {
    query: {
      menuCategories: { findFirst: m.catFindFirst, findMany: m.catFindMany },
      menuItems: { findMany: m.itemFindMany },
    },
    insert: vi.fn(() => ({ values: m.insertValues })),
    update: vi.fn(() => ({ set: m.updateSet })),
  },
}));
vi.mock("../../items/item.repository", () => ({ ITEM_DETAIL_RELATIONS: {} }));
vi.mock("../../availability/availability-view", () => ({
  withEffectiveMenuItemAvailability: m.itemAvail,
  withEffectiveModifierAvailability: m.modAvail,
}));
import { categoryRepository } from "@/modules/menu/categories/category.repository";
const option = { id: "o1" };
const item = {
  id: "i1",
  modifierGroupLinks: [{ id: "l1", group: { id: "g1", options: [option] } }],
};
const cat = { id: "c1", menuItems: [item] };
describe("categoryRepository coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.catFindFirst.mockResolvedValue({ id: "c1", branchId: null });
    m.catFindMany.mockImplementation(async (opts: any) => {
      opts?.with?.menuItems?.orderBy?.(
        { sortOrder: "s" },
        { asc: (v: any) => v },
      );
      return [cat];
    });
    m.itemFindMany.mockResolvedValue([{ id: "i1" }, { id: "i2" }]);
    m.insertReturning.mockResolvedValue([{ id: "c1" }]);
    m.insertValues.mockImplementation(() => ({ returning: m.insertReturning }));
    m.updateReturning.mockResolvedValue([{ id: "c1" }]);
    m.updateWhere.mockImplementation(() => ({ returning: m.updateReturning }));
    m.updateSet.mockImplementation(() => ({ where: m.updateWhere }));
  });
  it("finds category ownership", async () =>
    expect(categoryRepository.findById("t1", "c1")).resolves.toEqual({
      id: "c1",
      branchId: null,
    }));
  it("finds and transforms categories for branch draft visibility variants", async () => {
    for (const [branch, drafts] of [
      ["b1", true],
      ["b1", false],
      [null, true],
      [undefined, false],
    ] as any[]) {
      const rows = await categoryRepository.findMany("t1", branch, drafts);
      expect(rows[0]!.menuItems[0]!).toMatchObject({ effective: true });
      expect(
        rows[0]!.menuItems[0]!.modifierGroupLinks[0]!.group.options[0]!,
      ).toMatchObject({ effective: true });
    }
    expect(m.itemAvail).toHaveBeenCalled();
    expect(m.modAvail).toHaveBeenCalled();
  });
  it("creates and updates categories", async () => {
    await expect(
      categoryRepository.create({ tenantId: "t1", name: "Drinks" }),
    ).resolves.toEqual({ id: "c1" });
    await expect(
      categoryRepository.update("t1", "c1", { name: "Beverages" }),
    ).resolves.toEqual({ id: "c1" });
  });
  it("counts active items", async () =>
    expect(categoryRepository.itemCount("t1", "c1")).resolves.toBe(2));
});
