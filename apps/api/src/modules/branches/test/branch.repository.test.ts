import { beforeEach, describe, expect, it, vi } from "vitest";
const { branches, orders } = vi.hoisted(() => ({
  branches: {
    id: "id",
    tenantId: "tenantId",
    isActive: "isActive",
    createdAt: "createdAt",
    code: "code",
  },
  orders: {
    id: "id",
    tenantId: "tenantId",
    branchId: "branchId",
    status: "status",
    type: "type",
  },
}));
vi.mock("../../../db/schema", () => ({ branches, orders }));
const { findMany, branchFindFirst, orderFindFirst } = vi.hoisted(() => ({
  findMany: vi.fn(),
  branchFindFirst: vi.fn(),
  orderFindFirst: vi.fn(),
}));
const { db } = vi.hoisted(() => {
  const query = {
    branches: { findMany, findFirst: branchFindFirst },
    orders: { findFirst: orderFindFirst },
  };
  const db = { query, insert: vi.fn(), update: vi.fn() };
  return { query, db };
});
vi.mock("../../../db", () => ({ db }));
import { branchRepository } from "@/modules/branches/branch.repository";
beforeEach(() => {
  vi.clearAllMocks();
});
describe("branch repository", () => {
  it("maps branch lookup/count queries through the DB boundary", async () => {
    findMany
      .mockResolvedValueOnce([{ id: "b1" }])
      .mockResolvedValueOnce([{ id: "b1" }, { id: "b2" }]);
    branchFindFirst.mockResolvedValue({ id: "b1" });
    await expect(branchRepository.findMany("t1")).resolves.toEqual([
      { id: "b1" },
    ]);
    await expect(branchRepository.findById("t1", "b1")).resolves.toEqual({
      id: "b1",
    });
    await expect(branchRepository.findByCode("t1", "MAIN-01")).resolves.toEqual(
      { id: "b1" },
    );
    await expect(branchRepository.countActive("t1")).resolves.toBe(2);
    expect(findMany).toHaveBeenCalledTimes(2);
  });
  it("maps open-order checks to booleans", async () => {
    orderFindFirst
      .mockResolvedValueOnce({ id: "o1" })
      .mockResolvedValueOnce(undefined);
    await expect(branchRepository.hasOpenOrders("t1", "b1")).resolves.toBe(
      true,
    );
    await expect(
      branchRepository.hasOpenOrdersOfType("t1", "b1", "DINE_IN" as any),
    ).resolves.toBe(false);
    expect(orderFindFirst).toHaveBeenCalledTimes(2);
  });
});
