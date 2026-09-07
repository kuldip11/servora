import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  menuFindMany: vi.fn(),
  tenantFindFirst: vi.fn(),
  itemFindMany: vi.fn(),
  holidayFindFirst: vi.fn(),
  highest: vi.fn(),
}));
vi.mock("../../../../db", () => ({
  db: {
    query: {
      menus: { findMany: m.menuFindMany },
      tenants: { findFirst: m.tenantFindFirst },
      menuItems: { findMany: m.itemFindMany },
      holidays: { findFirst: m.holidayFindFirst },
    },
  },
}));
vi.mock("../../availability/schedule-precedence", () => ({
  highestPriorityActiveSchedule: m.highest,
}));
import { menuResolver } from "@/modules/menu/menus/menu-resolver.service";
const asOf = new Date("2026-09-05T12:00:00.000Z");
const item = (overrides: any = {}) => ({
  id: "i1",
  sku: "SKU1",
  categoryId: "c1",
  branchId: null,
  isPublished: true,
  deletedAt: null,
  effectiveFrom: null,
  ...overrides,
});
const localMenu = (overrides: any = {}) => ({
  id: "m1",
  tenantId: "t1",
  isDefault: false,
  status: "PUBLISHED",
  effectiveFrom: null,
  availableChannels: null,
  availableFulfillmentTypes: null,
  availableBranchIds: null,
  schedules: [],
  memberships: [{ menuItemId: "i1", item: item() }],
  ...overrides,
});
const orgMenu = (overrides: any = {}) => ({
  id: "om1",
  organizationId: "org1",
  isDefault: false,
  status: "PUBLISHED",
  effectiveFrom: null,
  availableChannels: null,
  availableFulfillmentTypes: null,
  availableBranchIds: null,
  organizationItems: [
    { id: "oi1", itemSku: "SKU1", sortOrder: 1, createdAt: asOf },
  ],
  ...overrides,
});

describe("menuResolver comprehensive coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(m).forEach((fn: any) => fn.mockReset());
    m.menuFindMany.mockResolvedValue([]);
    m.tenantFindFirst.mockResolvedValue({ organizationId: "org1" });
    m.itemFindMany.mockResolvedValue([]);
    m.holidayFindFirst.mockResolvedValue({ id: "h1" });
    m.highest.mockResolvedValue({ id: "schedule" });
  });
  it("filters local menus by status, effective time, context, schedule and item publication", async () => {
    m.menuFindMany.mockResolvedValueOnce([
      localMenu({ id: "draft", status: "DRAFT" }),
      localMenu({
        id: "future",
        effectiveFrom: new Date("2026-09-06T00:00:00Z"),
      }),
      localMenu({ id: "channel", availableChannels: ["CUSTOMER_QR"] }),
      localMenu({
        id: "plain",
        isDefault: true,
        memberships: [
          { menuItemId: "good", item: item({ id: "good" }) },
          { menuItemId: "bad", item: item({ id: "bad", isPublished: false }) },
        ],
      }),
      localMenu({ id: "scheduled", schedules: [{ id: "s1" }] }),
    ]);
    m.highest.mockImplementationOnce(
      async (_s: any, _d: any, isHoliday: any) => {
        expect(await isHoliday("Festival", "2026-09-05")).toBe(true);
        return { id: "s1" };
      },
    );
    const result = await menuResolver.getActiveMenus(
      "t1",
      "b1",
      "STAFF",
      "DINE_IN",
      asOf,
    );
    expect(result.map((x: any) => x.id)).toEqual(["scheduled"]);
    expect(m.holidayFindFirst).toHaveBeenCalled();
  });
  it("drops scheduled local menus with no active schedule and falls back when none remain", async () => {
    m.menuFindMany
      .mockResolvedValueOnce([localMenu({ schedules: [{ id: "s1" }] })])
      .mockResolvedValueOnce([]);
    m.highest.mockResolvedValueOnce(null);
    m.tenantFindFirst.mockResolvedValueOnce({ organizationId: null });
    await expect(
      menuResolver.getActiveMenus("t1", "b1", "STAFF", "DINE_IN", asOf),
    ).resolves.toEqual([]);
  });
  it("returns local defaults when they are the only active menus", async () => {
    m.menuFindMany.mockResolvedValueOnce([
      localMenu({ id: "default", isDefault: true }),
    ]);
    const result = await menuResolver.getActiveMenus(
      "t1",
      "b1",
      "STAFF",
      "DINE_IN",
      asOf,
    );
    expect(result.map((x: any) => x.id)).toEqual(["default"]);
    expect(m.tenantFindFirst).not.toHaveBeenCalled();
  });
  it("returns no inherited menus when organization menus have no active SKUs", async () => {
    m.menuFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        orgMenu({ status: "DRAFT" }),
        orgMenu({ effectiveFrom: new Date("2026-09-06T00:00:00Z") }),
        orgMenu({ availableBranchIds: ["b2"] }),
        orgMenu({ organizationItems: [] }),
      ]);
    await expect(
      menuResolver.getActiveMenus("t1", "b1", "STAFF", "DINE_IN", asOf),
    ).resolves.toEqual([]);
    expect(m.itemFindMany).not.toHaveBeenCalled();
  });
  it("maps inherited organization items to local published SKU items", async () => {
    m.menuFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      orgMenu({
        organizationItems: [
          { id: "oi1", itemSku: "SKU1", sortOrder: 1, createdAt: asOf },
          { id: "oi2", itemSku: "MISSING", sortOrder: 2, createdAt: asOf },
        ],
      }),
    ]);
    m.itemFindMany.mockResolvedValueOnce([
      item({ id: "i1", sku: "SKU1" }),
      item({ id: "hidden", sku: "HIDDEN", isPublished: false }),
      item({ id: "nosku", sku: null }),
    ]);
    const result = await menuResolver.getActiveMenus(
      "t1",
      "b1",
      "STAFF",
      "DINE_IN",
      asOf,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.memberships).toHaveLength(1);
    expect(result[0]!.memberships[0]!).toMatchObject({
      id: "org:oi1",
      menuItemId: "i1",
      categoryId: "c1",
    });
  });
  it("builds active item ids and applies item branch scope", async () => {
    const spy = vi.spyOn(menuResolver, "getActiveMenus").mockResolvedValueOnce([
      {
        memberships: [
          { menuItemId: "i1", item: { branchId: null } },
          { menuItemId: "i2", item: { branchId: "b1" } },
          { menuItemId: "i3", item: { branchId: "b2" } },
        ],
      },
    ] as any);
    await expect(
      menuResolver.getActiveItemIds("t1", "b1", "STAFF", "DINE_IN", asOf),
    ).resolves.toEqual(new Set(["i1", "i2"]));
    spy.mockRestore();
  });
});
