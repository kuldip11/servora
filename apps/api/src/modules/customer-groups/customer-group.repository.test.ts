import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  insertValues: vi.fn(),
  insertReturning: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
  updateReturning: vi.fn(),
  deleteWhere: vi.fn(),
  deleteReturning: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      customerGroups: {
        findMany: mocks.findMany,
        findFirst: mocks.findFirst,
      },
    },
    insert: vi.fn(() => ({ values: mocks.insertValues })),
    update: vi.fn(() => ({ set: mocks.updateSet })),
    delete: vi.fn(() => ({ where: mocks.deleteWhere })),
  },
}));

import { customerGroupRepository } from "./customer-group.repository";

describe("customerGroupRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([{ id: "g1" }]);
    mocks.findFirst.mockResolvedValue({ id: "g1" });
    mocks.insertValues.mockReturnValue({ returning: mocks.insertReturning });
    mocks.insertReturning.mockResolvedValue([{ id: "g1", name: "VIP" }]);
    mocks.updateSet.mockReturnValue({ where: mocks.updateWhere });
    mocks.updateWhere.mockReturnValue({ returning: mocks.updateReturning });
    mocks.updateReturning.mockResolvedValue([{ id: "g1", name: "VIP 2" }]);
    mocks.deleteWhere.mockReturnValue({ returning: mocks.deleteReturning });
    mocks.deleteReturning.mockResolvedValue([{ id: "g1" }]);
  });

  it("lists tenant groups and exercises name ordering", async () => {
    await expect(customerGroupRepository.list("t1")).resolves.toEqual([
      { id: "g1" },
    ]);
    const options = mocks.findMany.mock.calls[0]?.[0];
    expect(options).toBeDefined();
    const asc = vi.fn((value: unknown) => value);
    options.orderBy({ name: "name" }, { asc });
    expect(asc).toHaveBeenCalledWith("name");
  });

  it("finds a tenant-scoped group", async () => {
    await expect(customerGroupRepository.findById("t1", "g1")).resolves.toEqual(
      { id: "g1" },
    );
    expect(mocks.findFirst).toHaveBeenCalledOnce();
  });

  it("creates groups and normalizes numeric discounts to database strings", async () => {
    await expect(
      customerGroupRepository.create({
        tenantId: "t1",
        name: "VIP",
        discountPercent: 12.5,
        discountFixed: 4,
      }),
    ).resolves.toMatchObject({ id: "g1" });
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ discountPercent: "12.5", discountFixed: "4" }),
    );

    await customerGroupRepository.create({ tenantId: "t1", name: "Regular" });
    expect(mocks.insertValues).toHaveBeenLastCalledWith(
      expect.objectContaining({ discountPercent: null, discountFixed: null }),
    );
  });

  it("updates every optional field shape and supports clearing discounts", async () => {
    await customerGroupRepository.update("t1", "g1", {
      name: "VIP 2",
      discountPercent: 20,
      discountFixed: null,
    });
    expect(mocks.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "VIP 2",
        discountPercent: "20",
        discountFixed: null,
      }),
    );

    await customerGroupRepository.update("t1", "g1", {
      discountPercent: null,
      discountFixed: 3.5,
    });
    expect(mocks.updateSet).toHaveBeenLastCalledWith(
      expect.objectContaining({ discountPercent: null, discountFixed: "3.5" }),
    );

    await customerGroupRepository.update("t1", "g1", {});
    expect(mocks.updateSet).toHaveBeenLastCalledWith(
      expect.objectContaining({ updatedAt: expect.any(Date) }),
    );
  });

  it("returns undefined when an update affects no row", async () => {
    mocks.updateReturning.mockResolvedValueOnce([]);
    await expect(
      customerGroupRepository.update("t1", "missing", {}),
    ).resolves.toBeUndefined();
  });

  it("removes a tenant-scoped group and returns the deleted id", async () => {
    await expect(customerGroupRepository.remove("t1", "g1")).resolves.toEqual({
      id: "g1",
    });
    mocks.deleteReturning.mockResolvedValueOnce([]);
    await expect(
      customerGroupRepository.remove("t1", "missing"),
    ).resolves.toBeUndefined();
  });
});
