import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getActiveMenus: vi.fn(),
  listMenu: vi.fn(),
  getEffectiveItem: vi.fn(),
  findManyCombos: vi.fn(),
}));

vi.mock("@/modules/customer/customer-session.service", () => ({
  customerSessionService: { getSession: mocks.getSession },
}));
vi.mock("@/modules/menu/menus/menu-resolver.service", () => ({
  menuResolver: { getActiveMenus: mocks.getActiveMenus },
}));
vi.mock("@/modules/customer/customer.repository", () => ({
  customerRepository: { listMenu: mocks.listMenu },
}));
vi.mock("@/modules/menu/availability/availability.service", () => ({
  availabilityService: { getEffectiveItem: mocks.getEffectiveItem },
}));
vi.mock("@/db", () => ({
  db: { query: { combos: { findMany: mocks.findManyCombos } } },
}));

import { customerMenuService } from "@/modules/customer/customer-menu.service";

describe("customerMenuService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      tenantId: "t1",
      branchId: "b1",
      mode: "DINE_IN",
      branch: {
        id: "b1",
        name: "Main",
        address: "1 Test Street",
      },
      table: { id: "tb1", name: "T1", section: "Patio" },
    });
    mocks.getActiveMenus.mockResolvedValue([
      {
        id: "menu1",
        memberships: [{ menuItemId: "i1" }, { menuItemId: "i3" }],
      },
    ]);
    mocks.listMenu.mockResolvedValue({
      categories: [{ id: "c1" }],
      items: [
        { id: "i1", basePrice: 100, taxRate: 5, prepTimeMinutes: 10 },
        { id: "i2", basePrice: 200, taxRate: 12, prepTimeMinutes: 20 },
        { id: "i3", basePrice: 300, taxRate: 18, prepTimeMinutes: 30 },
      ],
    });
    mocks.findManyCombos.mockResolvedValue([
      {
        id: "combo-valid",
        slots: [
          {
            id: "s1",
            minSelections: 1,
            options: [
              { id: "o1", menuItemId: "i1" },
              { id: "o2", menuItemId: "i2" },
            ],
          },
        ],
      },
      {
        id: "combo-invalid",
        slots: [
          {
            id: "s2",
            minSelections: 1,
            options: [{ id: "o3", menuItemId: "i2" }],
          },
        ],
      },
    ]);
    mocks.getEffectiveItem.mockImplementation(async (_tenantId, itemId) => {
      if (itemId === "i2") {
        return {
          effectiveStatus: "INACTIVE",
          isHidden: false,
          effectivePrice: 220,
          effectiveTaxRate: 12,
          effectivePrepTimeMinutes: 22,
        };
      }
      if (itemId === "i3") {
        return {
          effectiveStatus: "ACTIVE",
          isHidden: true,
          effectivePrice: 330,
          effectiveTaxRate: 18,
          effectivePrepTimeMinutes: 33,
        };
      }
      return {
        effectiveStatus: "ACTIVE",
        isHidden: false,
        effectivePrice: 110,
        effectiveTaxRate: 6,
        effectivePrepTimeMinutes: 11,
      };
    });
  });

  it("returns only active menu members and viable combos with effective values", async () => {
    const result = await customerMenuService.getMenu("session-token");

    expect(mocks.getActiveMenus).toHaveBeenCalledWith(
      "t1",
      "b1",
      "CUSTOMER_QR",
      "DINE_IN",
      expect.any(Date),
    );
    expect(mocks.findManyCombos).toHaveBeenCalledOnce();
    const comboQuery = mocks.findManyCombos.mock.calls[0]?.[0];
    const and = vi.fn((...conditions: unknown[]) => conditions);
    const eq = vi.fn((left: unknown, right: unknown) => [left, right]);
    expect(
      comboQuery.where(
        { tenantId: "tenant-id", status: "status" },
        { and, eq },
      ),
    ).toEqual([
      ["tenant-id", "t1"],
      ["status", "ACTIVE"],
    ]);
    expect(eq).toHaveBeenCalledTimes(2);
    expect(and).toHaveBeenCalledOnce();
    expect(mocks.getEffectiveItem).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({
      restaurant: { id: "b1", name: "Main", address: "1 Test Street" },
      mode: "DINE_IN",
      table: { id: "tb1", name: "T1", section: "Patio" },
      categories: [{ id: "c1" }],
      items: [
        {
          id: "i1",
          basePrice: 110,
          taxRate: 6,
          prepTimeMinutes: 11,
        },
      ],
    });
    expect(result.combos).toHaveLength(1);
    expect(result.combos[0]?.id).toBe("combo-valid");
    expect(result.combos[0]?.slots[0]?.options).toEqual([
      { id: "o1", menuItemId: "i1" },
    ]);
  });

  it("returns null table details for takeaway sessions", async () => {
    mocks.getSession.mockResolvedValue({
      tenantId: "t1",
      branchId: "b1",
      mode: "TAKEAWAY",
      branch: { id: "b1", name: "Main", address: null },
      table: null,
    });
    mocks.getActiveMenus.mockResolvedValue([]);
    mocks.listMenu.mockResolvedValue({ categories: [], items: [] });
    mocks.findManyCombos.mockResolvedValue([]);

    const result = await customerMenuService.getMenu("takeaway-token");
    expect(result.table).toBeNull();
    expect(result.items).toEqual([]);
    expect(result.combos).toEqual([]);
    expect(mocks.getActiveMenus).toHaveBeenCalledWith(
      "t1",
      "b1",
      "CUSTOMER_QR",
      "TAKEAWAY",
      expect.any(Date),
    );
  });
});
