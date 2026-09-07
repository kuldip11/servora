import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const stationFindMany = vi.fn();
  const stationFindFirst = vi.fn();
  const menuItemFindFirst = vi.fn();
  const routeFindMany = vi.fn();
  const returning = vi.fn();
  const where = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where }));
  const values = vi.fn(() => ({ returning }));
  const insert = vi.fn(() => ({ values }));
  const update = vi.fn(() => ({ set }));
  const del = vi.fn(() => ({ where }));
  const selectThen = vi.fn();
  const selectWhere = vi.fn(() => ({ then: selectThen }));
  const innerJoin2 = vi.fn(() => ({ where: selectWhere }));
  const innerJoin1 = vi.fn(() => ({ innerJoin: innerJoin2 }));
  const from = vi.fn(() => ({
    innerJoin: innerJoin1,
    where: vi.fn(() => ({ then: selectThen })),
  }));
  const select = vi.fn(() => ({ from }));
  const txDeleteWhere = vi.fn();
  const txDelete = vi.fn(() => ({ where: txDeleteWhere }));
  const txReturning = vi.fn();
  const txValues = vi.fn(() => ({ returning: txReturning }));
  const txInsert = vi.fn(() => ({ values: txValues }));
  const transaction = vi.fn(async (cb: Function) =>
    cb({ delete: txDelete, insert: txInsert }),
  );
  return {
    stationFindMany,
    stationFindFirst,
    menuItemFindFirst,
    routeFindMany,
    returning,
    where,
    set,
    values,
    insert,
    update,
    del,
    selectThen,
    selectWhere,
    innerJoin2,
    innerJoin1,
    from,
    select,
    txDeleteWhere,
    txDelete,
    txReturning,
    txValues,
    txInsert,
    transaction,
  };
});
vi.mock("../../../../db", () => ({
  db: {
    query: {
      kitchenStations: {
        findMany: mocks.stationFindMany,
        findFirst: mocks.stationFindFirst,
      },
      menuItems: { findFirst: mocks.menuItemFindFirst },
      itemStationRouting: { findMany: mocks.routeFindMany },
    },
    insert: mocks.insert,
    update: mocks.update,
    delete: mocks.del,
    select: mocks.select,
    transaction: mocks.transaction,
  },
}));
import { stationRepository } from "@/modules/kitchen-tickets/stations/station.repository";

describe("stationRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.stationFindMany.mockResolvedValue([]);
    mocks.stationFindFirst.mockResolvedValue({ id: "s1" });
    mocks.menuItemFindFirst.mockResolvedValue({ id: "i1" });
    mocks.returning.mockResolvedValue([{ id: "row1" }]);
    mocks.txReturning.mockResolvedValue([{ id: "route1" }]);
    mocks.routeFindMany.mockResolvedValue([]);
    mocks.selectThen.mockImplementation((resolve: Function) =>
      Promise.resolve(resolve([{ id: "m1", tenantId: "t1" }])),
    );
  });
  it("lists stations with and without branch scope and finds one", async () => {
    await stationRepository.list("t1");
    await stationRepository.list("t1", "b1");
    await stationRepository.findById("t1", "s1");
    expect(mocks.stationFindMany).toHaveBeenCalledTimes(2);
    expect(mocks.stationFindFirst).toHaveBeenCalledOnce();
  });
  it("creates, updates and removes stations", async () => {
    await expect(
      stationRepository.create({
        tenantId: "t1",
        branchId: "b1",
        name: "G",
      } as any),
    ).resolves.toEqual({ id: "row1" });
    await expect(
      stationRepository.update("t1", "s1", { name: "H" }),
    ).resolves.toEqual({ id: "row1" });
    await expect(stationRepository.remove("t1", "s1")).resolves.toEqual({
      id: "row1",
    });
    expect(mocks.set).toHaveBeenCalledWith(
      expect.objectContaining({ name: "H", updatedAt: expect.any(Date) }),
    );
  });
  it("resolves routing resources without a modifier", async () => {
    await expect(
      stationRepository.findRoutingResources("t1", "i1", "s1", null),
    ).resolves.toEqual({
      item: { id: "i1" },
      station: { id: "s1" },
      modifier: null,
    });
  });
  it("resolves a linked modifier option", async () => {
    await expect(
      stationRepository.findRoutingResources("t1", "i1", "s1", "m1"),
    ).resolves.toEqual({
      item: { id: "i1" },
      station: { id: "s1" },
      modifier: { id: "m1", tenantId: "t1" },
    });
    expect(mocks.select).toHaveBeenCalled();
  });
  it("sets default and modifier routes transactionally", async () => {
    await expect(stationRepository.setRoute("i1", "s1")).resolves.toEqual({
      id: "route1",
    });
    await expect(stationRepository.setRoute("i1", "s1", "m1")).resolves.toEqual(
      { id: "route1" },
    );
    expect(mocks.txDeleteWhere).toHaveBeenCalledTimes(2);
    expect(mocks.txValues).toHaveBeenLastCalledWith({
      menuItemId: "i1",
      stationId: "s1",
      modifierOptionId: "m1",
    });
  });
  it("removes default and modifier routes and lists routes", async () => {
    await stationRepository.removeRoute("t1", "i1");
    await stationRepository.removeRoute("t1", "i1", "m1");
    await stationRepository.listRoutes("t1", "i1");
    expect(mocks.del).toHaveBeenCalledTimes(2);
    expect(mocks.routeFindMany).toHaveBeenCalledOnce();
  });
});
