import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  list,
  findById,
  create,
  createMany,
  update,
  remove,
  organizationIdForTenant,
  listOrganization,
} = vi.hoisted(() => ({
  list: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  createMany: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  organizationIdForTenant: vi.fn(),
  listOrganization: vi.fn(),
}));
const { record } = vi.hoisted(() => ({
  record: vi.fn().mockResolvedValue({ id: "event1" }),
}));
const { findCustomerGroup } = vi.hoisted(() => ({ findCustomerGroup: vi.fn() }));
const { findByIdItem, findCategory, findIdsByCategory, findIdsByMenu } =
  vi.hoisted(() => ({
    findByIdItem: vi.fn(),
    findCategory: vi.fn(),
    findIdsByCategory: vi.fn(),
    findIdsByMenu: vi.fn(),
  }));

vi.mock("@/modules/customer-groups/customer-group.repository", () => ({ customerGroupRepository: { findById: findCustomerGroup } }));
vi.mock("../price-rule.repository", () => ({
  priceRuleRepository: {
    list,
    findById,
    create,
    createMany,
    update,
    remove,
    organizationIdForTenant,
    listOrganization,
  },
}));
vi.mock("../../items/item.repository", () => ({
  itemRepository: {
    findById: findByIdItem,
    findCategory,
    findIdsByCategory,
    findIdsByMenu,
  },
}));
vi.mock("../../change-log/menu-change-log", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../change-log/menu-change-log")
  >()),
  menuChangeLog: { record },
}));

import { priceRuleService } from "@/modules/menu/pricing/price-rule.service";

const auth = {
  userId: "u1",
  tenantId: "t1",
  branchId: null,
  tenantWide: true,
  email: "owner@example.com",
  roles: [],
  permissions: ["menu:pricing:write", "menu:read"],
};

const baseInput = {
  menuItemId: "item1",
  price: 100,
} as const;

beforeEach(() => {
  vi.clearAllMocks();
  findByIdItem.mockResolvedValue({ id: "item1", branchId: null, variants: [] });
  list.mockResolvedValue([]);
  create.mockImplementation(async (data: unknown) => ({
    id: "new-rule",
    ...(data as object),
  }));
  createMany.mockImplementation(async (rows: unknown[]) =>
    rows.map((row, index) => ({ id: `bulk-${index + 1}`, ...(row as object) })),
  );
  findCategory.mockResolvedValue({ id: "cat1", branchId: null });
  findIdsByCategory.mockResolvedValue(["item1", "item2"]);
  findIdsByMenu.mockResolvedValue(["item1", "item2"]);
  findCustomerGroup.mockResolvedValue({ id: "cg1" });
  organizationIdForTenant.mockResolvedValue("org-1");
});

describe("price-rule service ambiguity validation (D1)", () => {
  it("allows two rules for the same item with disjoint time windows", async () => {
    list.mockResolvedValue([
      {
        id: "existing1",
        menuItemId: "item1",
        variantId: null,
        branchId: null,
        channel: "CUSTOMER_QR",
        fulfillmentType: null,
        startDate: null,
        endDate: null,
        startTime: "16:00:00",
        endTime: "18:00:00",
        priority: 0,
        isActive: true,
      },
    ]);
    await expect(
      priceRuleService.create(auth, {
        ...baseInput,
        channel: "CUSTOMER_QR",
        startTime: "18:00:00",
        endTime: "20:00:00",
      } as never),
    ).resolves.toBeDefined();
  });

  it("allows rules with different specificity even if windows overlap", async () => {
    list.mockResolvedValue([
      {
        id: "existing1",
        menuItemId: "item1",
        variantId: null,
        branchId: null,
        channel: "CUSTOMER_QR",
        fulfillmentType: null,
        startDate: null,
        endDate: null,
        startTime: "16:00:00",
        endTime: "18:00:00",
        priority: 0,
        isActive: true,
      },
    ]);
    await expect(
      priceRuleService.create(auth, {
        ...baseInput,
        channel: "CUSTOMER_QR",
        fulfillmentType: "DELIVERY",
        startTime: "16:00:00",
        endTime: "18:00:00",
      } as never),
    ).resolves.toBeDefined();
  });

  it("rejects cross-dimension scopes that can match the same context at equal specificity and priority", async () => {
    list.mockResolvedValue([
      {
        id: "existing1",
        menuItemId: "item1",
        variantId: null,
        branchId: "b1",
        channel: null,
        fulfillmentType: null,
        startDate: null,
        endDate: null,
        startTime: "16:00:00",
        endTime: "18:00:00",
        priority: 0,
        isActive: true,
      },
    ]);
    await expect(
      priceRuleService.create(auth, {
        ...baseInput,
        channel: "CUSTOMER_QR",
        startTime: "16:00:00",
        endTime: "18:00:00",
      } as never),
    ).rejects.toThrow(/ambiguous/i);
  });

  it("rejects a same-scope rule whose overlapping time window ties on specificity and priority", async () => {
    list.mockResolvedValue([
      {
        id: "existing1",
        menuItemId: "item1",
        variantId: null,
        branchId: null,
        channel: "CUSTOMER_QR",
        fulfillmentType: null,
        startDate: null,
        endDate: null,
        startTime: "16:00:00",
        endTime: "18:00:00",
        priority: 0,
        isActive: true,
      },
    ]);
    await expect(
      priceRuleService.create(auth, {
        ...baseInput,
        channel: "CUSTOMER_QR",
        startTime: "17:00:00",
        endTime: "19:00:00",
      } as never),
    ).rejects.toThrow(/ambiguous/i);
  });

  it("rejects an overnight window overlapping a same-scope daytime rule", async () => {
    findByIdItem.mockResolvedValue({
      id: "item1",
      branchId: "b1",
      variants: [],
    });
    list.mockResolvedValue([
      {
        id: "existing1",
        menuItemId: "item1",
        variantId: null,
        branchId: "b1",
        channel: null,
        fulfillmentType: null,
        startDate: null,
        endDate: null,
        startTime: "22:00:00",
        endTime: "02:00:00",
        priority: 0,
        isActive: true,
      },
    ]);
    await expect(
      priceRuleService.create(auth, {
        ...baseInput,
        branchId: "b1",
        startTime: "01:00:00",
        endTime: "05:00:00",
      } as never),
    ).rejects.toThrow(/ambiguous/i);
  });

  it("does not flag overlap when priority disambiguates the tie", async () => {
    list.mockResolvedValue([
      {
        id: "existing1",
        menuItemId: "item1",
        variantId: null,
        branchId: null,
        channel: "CUSTOMER_QR",
        fulfillmentType: null,
        startDate: null,
        endDate: null,
        startTime: "16:00:00",
        endTime: "18:00:00",
        priority: 5,
        isActive: true,
      },
    ]);
    await expect(
      priceRuleService.create(auth, {
        ...baseInput,
        channel: "CUSTOMER_QR",
        startTime: "17:00:00",
        endTime: "19:00:00",
        priority: 0,
      } as never),
    ).resolves.toBeDefined();
  });

  it("ignores inactive rules and the rule's own id when updating", async () => {
    findById.mockResolvedValue({
      id: "existing1",
      menuItemId: "item1",
      variantId: null,
      branchId: null,
      channel: "CUSTOMER_QR",
      fulfillmentType: null,
      startDate: null,
      endDate: null,
      startTime: "16:00:00",
      endTime: "18:00:00",
      priority: 0,
      price: "10.00",
      taxRate: null,
      isActive: true,
    });
    list.mockResolvedValue([
      {
        id: "existing1",
        menuItemId: "item1",
        variantId: null,
        branchId: null,
        channel: "CUSTOMER_QR",
        fulfillmentType: null,
        startDate: null,
        endDate: null,
        startTime: "16:00:00",
        endTime: "18:00:00",
        priority: 0,
        isActive: true,
      },
      {
        id: "inactive-rule",
        menuItemId: "item1",
        variantId: null,
        branchId: null,
        channel: "CUSTOMER_QR",
        fulfillmentType: null,
        startDate: null,
        endDate: null,
        startTime: "16:00:00",
        endTime: "18:00:00",
        priority: 0,
        isActive: false,
      },
    ]);
    update.mockResolvedValue({ id: "existing1" });
    await expect(
      priceRuleService.update(auth, "existing1", { price: 12 } as never),
    ).resolves.toBeDefined();
  });
});

describe("price-rule happy-hour bulk authoring (D4)", () => {
  it("creates one percent-off rule per item in the selected category", async () => {
    findByIdItem.mockImplementation(
      async (_tenantId: string, itemId: string) => ({
        id: itemId,
        branchId: null,
        variants: [],
      }),
    );
    const created = await priceRuleService.createHappyHour(auth, {
      categoryId: "cat1",
      percentOff: 20,
      startTime: "16:00:00",
      endTime: "18:00:00",
    });
    expect(created).toHaveLength(2);
    expect(createMany).toHaveBeenCalledWith([
      expect.objectContaining({
        tenantId: "t1",
        menuItemId: "item1",
        price: null,
        percentOff: "20",
        startTime: "16:00:00",
        endTime: "18:00:00",
      }),
      expect.objectContaining({
        tenantId: "t1",
        menuItemId: "item2",
        price: null,
        percentOff: "20",
        startTime: "16:00:00",
        endTime: "18:00:00",
      }),
    ]);
  });

  it("requires exactly one category/menu scope", async () => {
    await expect(
      priceRuleService.createHappyHour(auth, {
        percentOff: 20,
        startTime: "16:00:00",
        endTime: "18:00:00",
      }),
    ).rejects.toThrow(/exactly one/i);
    await expect(
      priceRuleService.createHappyHour(auth, {
        categoryId: "cat1",
        menuId: "menu1",
        percentOff: 20,
        startTime: "16:00:00",
        endTime: "18:00:00",
      }),
    ).rejects.toThrow(/exactly one/i);
  });
});

describe("G7 organization price-rule authorization", () => {
  const orgRule = {
    id: "org-rule",
    tenantId: null,
    organizationId: "org-1",
    menuItemId: null,
    menuItemSku: "PIZZA-1",
    variantId: null,
    branchId: null,
    channel: null,
    fulfillmentType: null,
    customerGroupId: null,
    coverTier: null,
    startDate: null,
    endDate: null,
    startTime: null,
    endTime: null,
    priority: 0,
    price: "90",
    percentOff: null,
    taxRate: null,
    isActive: true,
  };

  beforeEach(() => {
    findById.mockResolvedValue(orgRule);
    organizationIdForTenant.mockResolvedValue("org-1");
    listOrganization.mockResolvedValue([orgRule]);
    remove.mockResolvedValue(undefined);
  });

  it("blocks update/delete of organization rules without organization:manage", async () => {
    await expect(
      priceRuleService.update(auth, "org-rule", { price: 85 } as never),
    ).rejects.toThrow(/permission/i);
    await expect(priceRuleService.remove(auth, "org-rule")).rejects.toThrow(
      /permission/i,
    );
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it("allows organization rule deletion only from a tenant in that organization", async () => {
    const orgAuth = {
      ...auth,
      permissions: [...auth.permissions, "organization:manage"],
    };
    organizationIdForTenant.mockResolvedValue("org-2");
    await expect(priceRuleService.remove(orgAuth, "org-rule")).rejects.toThrow(
      /outside the active tenant organization/i,
    );
    expect(remove).not.toHaveBeenCalled();

    organizationIdForTenant.mockResolvedValue("org-1");
    await expect(
      priceRuleService.remove(orgAuth, "org-rule"),
    ).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledWith("t1", "org-rule");
  });
});


describe("price-rule service complete validation coverage", () => {
  it("covers list organization and tenant scopes", async () => {
    list.mockResolvedValue([{ id: "tenant" }]);
    await expect(priceRuleService.list(auth, "item1")).resolves.toEqual([{ id: "tenant" }]);
    const orgAuth = { ...auth, permissions: [...auth.permissions, "organization:manage"] };
    listOrganization.mockResolvedValue([{ id: "org" }]);
    await expect(priceRuleService.list(orgAuth, undefined, "org-1", "SKU")).resolves.toEqual([{ id: "org" }]);
    organizationIdForTenant.mockResolvedValueOnce("org-2");
    await expect(priceRuleService.list(orgAuth, undefined, "org-1")).rejects.toThrow(/outside the active tenant organization/i);
  });

  it("rejects invalid values and item scope combinations", async () => {
    await expect(priceRuleService.create(auth, { menuItemId: "item1" } as never)).rejects.toThrow(/exactly one/i);
    await expect(priceRuleService.create(auth, { menuItemId: "item1", price: 1, percentOff: 10 } as never)).rejects.toThrow(/exactly one/i);
    await expect(priceRuleService.create(auth, { menuItemId: "item1", percentOff: 0 } as never)).rejects.toThrow(/greater than 0/i);
    await expect(priceRuleService.create(auth, { menuItemId: "item1", percentOff: 101 } as never)).rejects.toThrow(/at most 100/i);
    await expect(priceRuleService.create(auth, { menuItemId: "item1", price: -1 } as never)).rejects.toThrow(/negative/i);
    await expect(priceRuleService.create(auth, { price: 10 } as never)).rejects.toThrow(/require menuItemId/i);
    findByIdItem.mockResolvedValueOnce(null);
    await expect(priceRuleService.create(auth, { menuItemId: "missing", price: 10 } as never)).rejects.toThrow(/Menu item not found/i);
    findByIdItem.mockResolvedValueOnce({ id: "item1", branchId: null, variants: [{ id: "v1" }] });
    await expect(priceRuleService.create(auth, { menuItemId: "item1", variantId: "v2", price: 10 } as never)).rejects.toThrow(/Variant does not belong/i);
    findCustomerGroup.mockResolvedValueOnce(null);
    await expect(priceRuleService.create(auth, { menuItemId: "item1", customerGroupId: "bad", price: 10 } as never)).rejects.toThrow(/Customer group/i);
  });

  it("validates organization and per-cover scopes", async () => {
    const orgAuth = { ...auth, permissions: [...auth.permissions, "organization:manage"] };
    organizationIdForTenant.mockResolvedValue("org-1");
    await expect(priceRuleService.create(orgAuth, { organizationId: "org-2", menuItemSku: "SKU", price: 10 } as never)).rejects.toThrow(/outside the active tenant organization/i);
    await expect(priceRuleService.create(orgAuth, { organizationId: "org-1", price: 10 } as never)).rejects.toThrow(/require menuItemSku/i);
    await expect(priceRuleService.create(orgAuth, { organizationId: "org-1", menuItemSku: "SKU", branchId: "b1", price: 10 } as never)).rejects.toThrow(/cannot target tenant-local/i);
    await expect(priceRuleService.create(auth, { isPerCover: true, menuItemId: "item1", price: 10 } as never)).rejects.toThrow(/cannot target a menu item/i);
    await expect(priceRuleService.create(auth, { isPerCover: true, variantId: "v1", price: 10 } as never)).rejects.toThrow(/cannot target a variant/i);
    await expect(priceRuleService.create(auth, { isPerCover: true, percentOff: 10 } as never)).rejects.toThrow(/absolute price/i);
    await expect(priceRuleService.create(auth, { menuItemId: "item1", coverTier: "ADULT", price: 10 } as never)).rejects.toThrow(/only valid on a per-cover/i);
  });

  it("persists conversions and organization rules", async () => {
    await priceRuleService.create(auth, { menuItemId: "item1", price: 12.5, taxRate: 5, effectiveFrom: "2026-09-05T10:00:00.000Z", isActive: false } as never);
    expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ price: "12.5", taxRate: "5", effectiveFrom: expect.any(Date), isActive: false }));
    await priceRuleService.create(auth, { menuItemId: "item1", percentOff: 15, taxRate: null, effectiveFrom: null } as never);
    expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ percentOff: "15", taxRate: null, effectiveFrom: null }));
    const orgAuth = { ...auth, permissions: [...auth.permissions, "organization:manage"] };
    organizationIdForTenant.mockResolvedValue("org-1"); listOrganization.mockResolvedValue([]);
    await expect(priceRuleService.create(orgAuth, { organizationId: "org-1", menuItemSku: " SKU ", price: 10 } as never)).resolves.toBeDefined();
    expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ organizationId: "org-1", menuItemSku: "SKU", tenantId: null }));
  });

  it("covers update and happy-hour edge branches", async () => {
    findById.mockResolvedValueOnce(undefined);
    await expect(priceRuleService.update(auth, "missing", { price: 10 } as never)).rejects.toThrow(/not found/i);
    findById.mockResolvedValue({ id: "r1", tenantId: "t1", organizationId: null, menuItemId: "item1", menuItemSku: null, variantId: null, branchId: null, customerGroupId: null, coverTier: null, isPerCover: false, channel: null, fulfillmentType: null, startDate: null, endDate: null, startTime: null, endTime: null, priority: 0, price: "10", percentOff: null, taxRate: null, isActive: true });
    update.mockResolvedValueOnce(undefined);
    await expect(priceRuleService.update(auth, "r1", { price: 11 } as never)).rejects.toThrow(/not found/i);
    update.mockResolvedValueOnce({ id: "r1", price: "11" });
    await expect(priceRuleService.update(auth, "r1", { price: 11 } as never)).resolves.toMatchObject({ id: "r1" });

    await expect(priceRuleService.createHappyHour(auth, { categoryId: "cat1", percentOff: 0, startTime: "10:00", endTime: "11:00" })).rejects.toThrow(/greater than 0/i);
    await expect(priceRuleService.createHappyHour(auth, { categoryId: "cat1", percentOff: 20, startTime: "10:00", endTime: "11:00", startDate: "2026-09-06", endDate: "2026-09-05" })).rejects.toThrow(/start date/i);
    findCategory.mockResolvedValueOnce(null);
    await expect(priceRuleService.createHappyHour(auth, { categoryId: "bad", percentOff: 20, startTime: "10:00", endTime: "11:00" })).rejects.toThrow(/category not found/i);
    findIdsByCategory.mockResolvedValueOnce([]);
    await expect(priceRuleService.createHappyHour(auth, { categoryId: "cat1", percentOff: 20, startTime: "10:00", endTime: "11:00" })).rejects.toThrow(/no menu items/i);
    findIdsByMenu.mockResolvedValueOnce(null);
    await expect(priceRuleService.createHappyHour(auth, { menuId: "bad", percentOff: 20, startTime: "10:00", endTime: "11:00" })).rejects.toThrow(/Menu not found/i);
    findIdsByMenu.mockResolvedValueOnce(["item1"]);
    await expect(priceRuleService.createHappyHour(auth, { menuId: "m1", percentOff: 20, startTime: "10:00", endTime: "11:00" })).resolves.toHaveLength(1);
  });

  it("returns silently when removing a missing rule", async () => {
    findById.mockResolvedValueOnce(undefined);
    await expect(priceRuleService.remove(auth, "missing")).resolves.toBeUndefined();
    expect(remove).not.toHaveBeenCalled();
  });
});
