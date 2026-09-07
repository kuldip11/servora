import { beforeEach, describe, expect, it, vi } from "vitest";

const { listForItem, listItems, findResources, upsert, remove } = vi.hoisted(
  () => ({
    listForItem: vi.fn(),
    listItems: vi.fn(),
    findResources: vi.fn(),
    upsert: vi.fn(),
    remove: vi.fn(),
  }),
);
const { record } = vi.hoisted(() => ({
  record: vi.fn().mockResolvedValue({ id: "event1" }),
}));
vi.mock("../membership.repository", () => ({
  membershipRepository: {
    listForItem,
    listItems,
    findResources,
    upsert,
    remove,
  },
}));
vi.mock("../../change-log/menu-change-log", () => ({
  menuChangeLog: { record },
}));
import { membershipService } from "@/modules/menu/memberships/membership.service";

const auth = (permissions: string[]) => ({
  userId: "u1",
  tenantId: "t1",
  branchId: "b1",
  email: "owner@example.com",
  roles: [],
  permissions,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("menu membership service", () => {
  it("assigns a tenant-owned item to a menu category", async () => {
    findResources.mockResolvedValue({
      menu: { id: "menu1" },
      item: { id: "item1", branchId: "b1" },
      category: { id: "cat1", branchId: "b1" },
    });
    upsert.mockResolvedValue({ id: "member1" });
    await expect(
      membershipService.assign(auth(["menu:update"]), "item1", {
        menuId: "menu1",
        categoryId: "cat1",
        sortOrder: 4,
      }),
    ).resolves.toEqual({ id: "member1" });
    expect(upsert).toHaveBeenCalledWith({
      menuId: "menu1",
      menuItemId: "item1",
      categoryId: "cat1",
      sortOrder: 4,
    });
  });

  it("rejects cross-branch category assignments", async () => {
    findResources.mockResolvedValue({
      menu: { id: "menu1" },
      item: { id: "item1", branchId: "b1" },
      category: { id: "cat1", branchId: "b2" },
    });
    await expect(
      membershipService.assign(auth(["menu:update"]), "item1", {
        menuId: "menu1",
        categoryId: "cat1",
      }),
    ).rejects.toThrow("Category branch does not match");
  });

  it("guards reads and writes with existing menu permissions", async () => {
    await expect(
      membershipService.listForItem(auth([]), "item1"),
    ).rejects.toThrow("Insufficient permissions");
    await expect(
      membershipService.remove(auth([]), "item1", "menu1"),
    ).rejects.toThrow("Insufficient permissions");
  });
});

describe("menu membership service coverage", () => {
  it("lists memberships and menu items with read permission", async () => {
    listForItem.mockResolvedValue([{ id: "m1" }]);
    listItems.mockResolvedValue([{ id: "m2" }]);
    await expect(
      membershipService.listForItem(auth(["menu:read"]), "item1"),
    ).resolves.toEqual([{ id: "m1" }]);
    await expect(
      membershipService.listItems(auth(["menu:read"]), "menu1"),
    ).resolves.toEqual([{ id: "m2" }]);
  });

  it("rejects missing assignment resources", async () => {
    for (const resources of [
      { menu: null, item: { id: "i" }, category: { id: "c" } },
      { menu: { id: "m" }, item: null, category: { id: "c" } },
      { menu: { id: "m" }, item: { id: "i" }, category: null },
    ]) {
      findResources.mockResolvedValueOnce(resources);
      await expect(
        membershipService.assign(auth(["menu:update"]), "item1", {
          menuId: "menu1",
          categoryId: "cat1",
        }),
      ).rejects.toThrow("Menu, item, or category not found");
    }
  });

  it("allows unscoped categories and defaults sort order to zero", async () => {
    findResources.mockResolvedValue({
      menu: { id: "menu1" },
      item: { id: "item1", branchId: "b1" },
      category: { id: "cat1", branchId: null },
    });
    upsert.mockResolvedValue({ id: "member1" });
    await membershipService.assign(auth(["menu:update"]), "item1", {
      menuId: "menu1",
      categoryId: "cat1",
    });
    expect(upsert).toHaveBeenCalledWith({
      menuId: "menu1",
      menuItemId: "item1",
      categoryId: "cat1",
      sortOrder: 0,
    });
    expect(record).toHaveBeenCalledWith(
      expect.anything(),
      "MENU_MEMBERSHIP",
      "member1",
      "UPDATED",
      expect.objectContaining({ sortOrder: 0 }),
    );
  });

  it("removes memberships and records the change", async () => {
    remove.mockResolvedValue(undefined);
    await membershipService.remove(auth(["menu:update"]), "item1", "menu1");
    expect(remove).toHaveBeenCalledWith("t1", "item1", "menu1");
    expect(record).toHaveBeenCalledWith(
      expect.anything(),
      "MENU_MEMBERSHIP",
      "item1",
      "DELETED",
      { menuId: "menu1", menuItemId: "item1" },
    );
  });
});
