import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  findById: vi.fn(),
  findCategory: vi.fn(),
}));

vi.mock("@/core/auth", () => ({
  requirePermission: vi.fn(),
  requireBranch: (auth: { branchId?: string | null }) => auth.branchId,
}));
vi.mock("@/modules/menu/items/item.repository", () => ({
  itemRepository: {
    ...repository,
    create: vi.fn(),
    update: vi.fn(),
    validateVariantSync: vi.fn(),
  },
}));
vi.mock("@/modules/menu/modifiers/modifier.repository", () => ({
  modifierRepository: {
    findOwnedTagIds: vi.fn(async () => new Set()),
    findOwnedModifierGroupIds: vi.fn(async () => new Set()),
  },
}));
vi.mock("@/modules/menu/change-log/menu-change-log", () => ({
  buildDiff: vi.fn(),
  menuChangeLog: { record: vi.fn() },
}));
vi.mock("@/modules/inventory/inventory.service", () => ({
  inventoryService: {},
}));

import { itemService } from "@/modules/menu/items/item.service";

const auth = (overrides: Record<string, unknown> = {}) =>
  ({
    userId: "user-a",
    tenantId: "tenant-a",
    branchId: "branch-a",
    tenantWide: false,
    authorizedBranchIds: ["branch-a"],
    permissions: ["menu:read", "menu:create", "menu:update"],
    roles: [],
    ...overrides,
  }) as any;

describe("menu adversarial tenant and branch access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("never looks up an item outside the authenticated tenant", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      itemService.getById(auth(), "foreign-item-id"),
    ).rejects.toThrow();

    expect(repository.findById).toHaveBeenCalledWith(
      "tenant-a",
      "foreign-item-id",
    );
  });

  it("rejects a branch-scoped user reading an item from another branch", async () => {
    repository.findById.mockResolvedValue({
      id: "item-b",
      tenantId: "tenant-a",
      branchId: "branch-b",
    });

    await expect(itemService.getById(auth(), "item-b")).rejects.toThrow();
  });

  it("rejects creating an item under a category from another branch", async () => {
    repository.findCategory.mockResolvedValue({
      id: "category-b",
      branchId: "branch-b",
    });

    await expect(
      itemService.create(auth(), {
        categoryId: "category-b",
        name: "Cross branch item",
        basePrice: 100,
      }),
    ).rejects.toThrow("Category branch does not match the active menu branch");
  });
});
