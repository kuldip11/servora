import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findBranch: vi.fn(),
  findTable: vi.fn(),
  findTicket: vi.fn(),
  findOrder: vi.fn(),
  findSession: vi.fn(),
  findCategories: vi.fn(),
  findItems: vi.fn(),
  insertValues: vi.fn(),
  insertReturning: vi.fn(),
  itemAvailability: vi.fn((item) => ({ ...item, effectiveStatus: "ACTIVE" })),
  modifierAvailability: vi.fn((option) => ({ ...option, effectiveStatus: "ACTIVE" })),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      branches: { findFirst: mocks.findBranch },
      restaurantTables: { findFirst: mocks.findTable },
      kitchenTickets: { findFirst: mocks.findTicket },
      orders: { findFirst: mocks.findOrder },
      customerSessions: { findFirst: mocks.findSession },
      menuCategories: { findMany: mocks.findCategories },
      menuItems: { findMany: mocks.findItems },
    },
    insert: vi.fn(() => ({ values: mocks.insertValues })),
  },
}));
vi.mock("@/modules/menu/availability/availability-view", () => ({
  withEffectiveMenuItemAvailability: mocks.itemAvailability,
  withEffectiveModifierAvailability: mocks.modifierAvailability,
}));

import { customerRepository } from "@/modules/customer/customer.repository";

describe("customerRepository coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findBranch.mockResolvedValue({ id: "b1" });
    mocks.findTable.mockResolvedValue({ id: "table1" });
    mocks.findTicket.mockResolvedValue({ id: "kt1" });
    mocks.findOrder.mockResolvedValue({ id: "o1", status: "OPEN" });
    mocks.findSession.mockResolvedValue({ id: "s1" });
    mocks.findCategories.mockResolvedValue([{ id: "c1", name: "Food", sortOrder: 2 }]);
    mocks.findItems.mockResolvedValue([
      {
        id: "mi1",
        name: "Burger",
        sortOrder: 1,
        modifierGroupLinks: [
          {
            id: "link1",
            group: {
              id: "g1",
              options: [{ id: "m1" }, { id: "m2" }],
            },
          },
        ],
      },
    ]);
    mocks.insertValues.mockReturnValue({ returning: mocks.insertReturning });
    mocks.insertReturning.mockResolvedValue([{ id: "s1", token: "tok" }]);
  });

  it("looks up branches, tables, request tickets, open orders and sessions", async () => {
    await expect(customerRepository.findBranchByTakeawayQrToken("qr")).resolves.toEqual({ id: "b1" });
    await expect(customerRepository.findTableByQrToken("qr")).resolves.toEqual({ id: "table1" });
    await expect(customerRepository.findCustomerRequestTicket("o1", "req1")).resolves.toEqual({ id: "kt1" });
    await expect(customerRepository.findOpenOrderBySession("t1", "b1", "s1")).resolves.toEqual({ id: "o1", status: "OPEN" });
    await expect(customerRepository.findSession("tok")).resolves.toEqual({ id: "s1" });

    expect(mocks.findBranch).toHaveBeenCalledOnce();
    expect(mocks.findTable).toHaveBeenCalledOnce();
    expect(mocks.findTicket).toHaveBeenCalledOnce();
    expect(mocks.findOrder).toHaveBeenCalledOnce();
    expect(mocks.findSession).toHaveBeenCalledOnce();
  });

  it("creates and returns the persisted customer session", async () => {
    const expiresAt = new Date("2030-01-01T00:00:00Z");
    await expect(
      customerRepository.createSession({
        tenantId: "t1",
        branchId: "b1",
        tableId: "table1",
        mode: "DINE_IN",
        expiresAt,
      }),
    ).resolves.toEqual({ id: "s1", token: "tok" });
    expect(mocks.insertValues).toHaveBeenCalledWith({
      tenantId: "t1",
      branchId: "b1",
      tableId: "table1",
      mode: "DINE_IN",
      expiresAt,
    });
  });

  it("lists menu categories/items and resolves nested effective availability", async () => {
    const result = await customerRepository.listMenu("t1", "b1");

    expect(result.categories).toEqual([{ id: "c1", name: "Food", sortOrder: 2 }]);
    expect(result.items[0]).toMatchObject({ id: "mi1", effectiveStatus: "ACTIVE" });
    expect(result.items[0]?.modifierGroupLinks[0]?.group.options).toEqual([
      { id: "m1", effectiveStatus: "ACTIVE" },
      { id: "m2", effectiveStatus: "ACTIVE" },
    ]);
    expect(mocks.itemAvailability).toHaveBeenCalledOnce();
    expect(mocks.modifierAvailability).toHaveBeenCalledTimes(2);
  });

  it("executes category and item ordering callbacks", async () => {
    await customerRepository.listMenu("t1", "b1");

    const categoryOptions = mocks.findCategories.mock.calls[0]?.[0];
    const itemOptions = mocks.findItems.mock.calls[0]?.[0];
    const asc = vi.fn((value) => `asc:${String(value)}`);

    expect(categoryOptions.orderBy({ sortOrder: "sort", name: "name" }, { asc })).toEqual([
      "asc:sort",
      "asc:name",
    ]);
    expect(itemOptions.orderBy({ sortOrder: "sort", name: "name" }, { asc })).toEqual([
      "asc:sort",
      "asc:name",
    ]);
    expect(asc).toHaveBeenCalledTimes(4);
  });
});
