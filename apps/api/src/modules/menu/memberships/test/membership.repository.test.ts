import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  membershipFindMany: vi.fn(),
  menuFindFirst: vi.fn(),
  itemFindFirst: vi.fn(),
  categoryFindFirst: vi.fn(),
  insertValues: vi.fn(),
  onConflictDoUpdate: vi.fn(),
  insertReturning: vi.fn(),
  deleteWhere: vi.fn(),
  deleteReturning: vi.fn(),
}));

vi.mock("../../../../db", () => ({
  db: {
    query: {
      menuMemberships: { findMany: m.membershipFindMany },
      menus: { findFirst: m.menuFindFirst },
      menuItems: { findFirst: m.itemFindFirst },
      menuCategories: { findFirst: m.categoryFindFirst },
    },
    insert: vi.fn(() => ({ values: m.insertValues })),
    delete: vi.fn(() => ({ where: m.deleteWhere })),
  },
}));

import { membershipRepository } from "@/modules/menu/memberships/membership.repository";

const own = {
  id: "m1",
  item: { tenantId: "t1" },
  menu: { tenantId: "t1" },
} as any;
const foreign = {
  id: "m2",
  item: { tenantId: "t2" },
  menu: { tenantId: "t2" },
} as any;

describe("membershipRepository coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.membershipFindMany.mockResolvedValue([own, foreign]);
    m.menuFindFirst.mockResolvedValue({ id: "menu1", tenantId: "t1" });
    m.itemFindFirst.mockResolvedValue({ id: "item1", tenantId: "t1" });
    m.categoryFindFirst.mockResolvedValue({ id: "cat1", tenantId: "t1" });
    m.insertReturning.mockResolvedValue([{ id: "member1" }]);
    m.onConflictDoUpdate.mockImplementation(() => ({
      returning: m.insertReturning,
    }));
    m.insertValues.mockImplementation(() => ({
      onConflictDoUpdate: m.onConflictDoUpdate,
    }));
    m.deleteReturning.mockResolvedValue([{ id: "member1" }]);
    m.deleteWhere.mockImplementation(() => ({ returning: m.deleteReturning }));
  });

  it("filters item memberships to the tenant", async () => {
    await expect(
      membershipRepository.listForItem("t1", "item1"),
    ).resolves.toEqual([own]);
  });

  it("filters menu items to tenant-owned menus", async () => {
    await expect(
      membershipRepository.listItems("t1", "menu1"),
    ).resolves.toEqual([own]);
  });

  it("loads all assignment resources", async () => {
    await expect(
      membershipRepository.findResources("t1", "menu1", "item1", "cat1"),
    ).resolves.toEqual({
      menu: { id: "menu1", tenantId: "t1" },
      item: { id: "item1", tenantId: "t1" },
      category: { id: "cat1", tenantId: "t1" },
    });
  });

  it("upserts memberships and returns the row", async () => {
    const input = {
      menuId: "menu1",
      menuItemId: "item1",
      categoryId: "cat1",
      sortOrder: 3,
    };
    await expect(membershipRepository.upsert(input)).resolves.toEqual({
      id: "member1",
    });
    expect(m.insertValues).toHaveBeenCalledWith(input);
    expect(m.onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({ categoryId: "cat1", sortOrder: 3 }),
      }),
    );
  });

  it("returns undefined when item or menu is not tenant-owned", async () => {
    m.itemFindFirst.mockResolvedValueOnce(undefined);
    await expect(
      membershipRepository.remove("t1", "item1", "menu1"),
    ).resolves.toBeUndefined();
    m.itemFindFirst.mockResolvedValueOnce({ id: "item1" });
    m.menuFindFirst.mockResolvedValueOnce(undefined);
    await expect(
      membershipRepository.remove("t1", "item1", "menu1"),
    ).resolves.toBeUndefined();
    expect(m.deleteWhere).not.toHaveBeenCalled();
  });

  it("deletes and returns the removed membership", async () => {
    await expect(
      membershipRepository.remove("t1", "item1", "menu1"),
    ).resolves.toEqual({ id: "member1" });
    m.deleteReturning.mockResolvedValueOnce([]);
    await expect(
      membershipRepository.remove("t1", "item1", "menu1"),
    ).resolves.toBeUndefined();
  });
});
