import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  tableFindMany: vi.fn(),
  tableFindFirst: vi.fn(),
  orderFindFirst: vi.fn(),
  transaction: vi.fn(),
  insert: vi.fn(),
  insertValues: vi.fn(),
  insertReturning: vi.fn(),
  update: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
  updateReturning: vi.fn(),
  txUpdate: vi.fn(),
  txUpdateSet: vi.fn(),
  txUpdateWhere: vi.fn(),
  txUpdateReturning: vi.fn(),
  txInsert: vi.fn(),
  txInsertValues: vi.fn(),
}));
vi.mock("@/db", () => {
  m.insert.mockImplementation(() => ({ values: m.insertValues }));
  m.insertValues.mockImplementation(() => ({ returning: m.insertReturning }));
  m.update.mockImplementation(() => ({ set: m.updateSet }));
  m.updateSet.mockImplementation(() => ({ where: m.updateWhere }));
  m.updateWhere.mockImplementation(() => ({ returning: m.updateReturning }));
  m.txUpdate.mockImplementation(() => ({ set: m.txUpdateSet }));
  m.txUpdateSet.mockImplementation(() => ({ where: m.txUpdateWhere }));
  m.txUpdateWhere.mockImplementation(() => ({
    returning: m.txUpdateReturning,
    then: Promise.resolve(undefined).then.bind(Promise.resolve(undefined)),
  }));
  m.txInsert.mockImplementation(() => ({ values: m.txInsertValues }));
  m.transaction.mockImplementation(async (fn: Function) =>
    fn({ update: m.txUpdate, insert: m.txInsert }),
  );
  return {
    db: {
      query: {
        restaurantTables: {
          findMany: m.tableFindMany,
          findFirst: m.tableFindFirst,
        },
        orders: { findFirst: m.orderFindFirst },
      },
      insert: m.insert,
      update: m.update,
      transaction: m.transaction,
    },
  };
});
import { tableRepository } from "../table.repository";
describe("table repository comprehensive coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.tableFindMany.mockResolvedValue([{ id: "t1" }]);
    m.tableFindFirst.mockResolvedValue({ id: "t1" });
    m.orderFindFirst.mockResolvedValue({ id: "o1" });
    m.insertReturning.mockResolvedValue([{ id: "t1" }]);
    m.updateReturning.mockResolvedValue([{ id: "t1" }]);
    m.txUpdateReturning.mockResolvedValue([{ id: "row" }]);
    m.txInsertValues.mockResolvedValue(undefined);
  });
  it("covers list branches/find/create/update/delete/open orders", async () => {
    await tableRepository.findMany("tenant", "b1");
    await tableRepository.findMany("tenant", null);
    await tableRepository.findById("tenant", "t1");
    await expect(
      tableRepository.create({ tenantId: "tenant", branchId: "b1", name: "T" }),
    ).resolves.toEqual({ id: "t1" });
    await expect(
      tableRepository.update("tenant", "t1", { name: "N" }),
    ).resolves.toEqual({ id: "t1" });
    m.updateReturning.mockResolvedValueOnce([]);
    await expect(
      tableRepository.update("tenant", "t1", {}),
    ).resolves.toBeUndefined();
    m.updateReturning.mockResolvedValueOnce([{ id: "t1" }]);
    await expect(tableRepository.softDelete("tenant", "t1")).resolves.toEqual({
      id: "t1",
    });
    await expect(tableRepository.hasOpenOrders("tenant", "t1")).resolves.toBe(
      true,
    );
    m.orderFindFirst.mockResolvedValueOnce(undefined);
    await expect(tableRepository.hasOpenOrders("tenant", "t1")).resolves.toBe(
      false,
    );
  });
  it("regenerates QR and conditionally invalidates sessions", async () => {
    m.txUpdateReturning.mockResolvedValueOnce([{ id: "t1" }]);
    await expect(
      tableRepository.regenerateQrToken("tenant", "t1"),
    ).resolves.toEqual({ id: "t1" });
    expect(m.txUpdate).toHaveBeenCalledTimes(2);
    m.txUpdateReturning.mockResolvedValueOnce([]);
    await expect(
      tableRepository.regenerateQrToken("tenant", "missing"),
    ).resolves.toBeUndefined();
  });
  it("transfers order tables successfully with session and reason", async () => {
    m.txUpdateReturning
      .mockResolvedValueOnce([{ id: "new" }])
      .mockResolvedValueOnce([{ id: "old" }])
      .mockResolvedValueOnce([{ id: "order" }]);
    const result = await tableRepository.transferOrderTable({
      tenantId: "tenant",
      branchId: "b1",
      orderId: "o1",
      oldTableId: "old",
      newTableId: "new",
      customerSessionId: "s1",
      changedBy: "u1",
      oldTableName: "Old",
      newTableName: "New",
      reason: " moved ",
    });
    expect(result).toEqual({
      order: { id: "order" },
      oldTable: { id: "old" },
      newTable: { id: "new" },
    });
    expect(m.txInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "Table transfer: Old → New · moved" }),
    );
  });
  it("covers transfer without session/reason and conflict branches", async () => {
    m.txUpdateReturning
      .mockResolvedValueOnce([{ id: "new" }])
      .mockResolvedValueOnce([{ id: "old" }])
      .mockResolvedValueOnce([{ id: "order" }]);
    await tableRepository.transferOrderTable({
      tenantId: "tenant",
      branchId: "b1",
      orderId: "o1",
      oldTableId: "old",
      newTableId: "new",
      changedBy: "u1",
      oldTableName: "Old",
      newTableName: "New",
    });
    m.txUpdateReturning.mockResolvedValueOnce([]);
    await expect(
      tableRepository.transferOrderTable({
        tenantId: "tenant",
        branchId: "b1",
        orderId: "o1",
        oldTableId: "old",
        newTableId: "new",
        changedBy: "u1",
        oldTableName: "Old",
        newTableName: "New",
      }),
    ).resolves.toBeUndefined();
    m.txUpdateReturning
      .mockResolvedValueOnce([{ id: "new" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "order" }]);
    await expect(
      tableRepository.transferOrderTable({
        tenantId: "tenant",
        branchId: "b1",
        orderId: "o1",
        oldTableId: "old",
        newTableId: "new",
        changedBy: "u1",
        oldTableName: "Old",
        newTableName: "New",
      }),
    ).rejects.toThrow("changed while");
    m.txUpdateReturning
      .mockResolvedValueOnce([{ id: "new" }])
      .mockResolvedValueOnce([{ id: "old" }])
      .mockResolvedValueOnce([]);
    await expect(
      tableRepository.transferOrderTable({
        tenantId: "tenant",
        branchId: "b1",
        orderId: "o1",
        oldTableId: "old",
        newTableId: "new",
        changedBy: "u1",
        oldTableName: "Old",
        newTableName: "New",
      }),
    ).rejects.toThrow("changed while");
  });
});
