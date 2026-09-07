import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  txOrderFindFirst: vi.fn(),
  txOrderFindMany: vi.fn(),
  txBillFindMany: vi.fn(),
  txItemFindMany: vi.fn(),
  txItemFindFirst: vi.fn(),
  txPaymentFindFirst: vi.fn(),
  txInsert: vi.fn(),
  txDelete: vi.fn(),
  txDeleteWhere: vi.fn(),
  txUpdate: vi.fn(),
  txUpdateSet: vi.fn(),
  txUpdateWhere: vi.fn(),
  txSelect: vi.fn(),
  transaction: vi.fn(),
  dbOrderFindFirst: vi.fn(),
  dbBillFindMany: vi.fn(),
  dbBillFindFirst: vi.fn(),
  dbItemFindMany: vi.fn(),
  dbSelect: vi.fn(),
}));

vi.mock("@/db", () => {
  const tx = {
    query: {
      orders: { findFirst: mocks.txOrderFindFirst, findMany: mocks.txOrderFindMany },
      bills: { findMany: mocks.txBillFindMany },
      orderItems: { findMany: mocks.txItemFindMany, findFirst: mocks.txItemFindFirst },
      payments: { findFirst: mocks.txPaymentFindFirst },
    },
    insert: mocks.txInsert,
    delete: mocks.txDelete,
    update: mocks.txUpdate,
    select: mocks.txSelect,
  };
  return {
    db: {
      transaction: mocks.transaction,
      query: {
        orders: { findFirst: mocks.dbOrderFindFirst },
        bills: { findMany: mocks.dbBillFindMany, findFirst: mocks.dbBillFindFirst },
        orderItems: { findMany: mocks.dbItemFindMany },
      },
      select: mocks.dbSelect,
    },
    __tx: tx,
  };
});

import { billingRepository } from "@/modules/billing/billing.repository";

const tx = {
  query: {
    orders: { findFirst: mocks.txOrderFindFirst, findMany: mocks.txOrderFindMany },
    bills: { findMany: mocks.txBillFindMany },
    orderItems: { findMany: mocks.txItemFindMany, findFirst: mocks.txItemFindFirst },
    payments: { findFirst: mocks.txPaymentFindFirst },
  },
  insert: mocks.txInsert,
  delete: mocks.txDelete,
  update: mocks.txUpdate,
  select: mocks.txSelect,
};

const baseOrder = {
  id: "o1",
  branchId: "b1",
  subtotal: "30.00",
  taxAmount: "3.00",
  discountAmount: "1.00",
  serviceChargeAmount: "2.00",
  roundingAdjustment: "0.00",
  totalAmount: "34.00",
};

const activeItems = [
  {
    id: "i1",
    subtotal: "10.00",
    taxRate: "10",
    taxMode: "EXCLUSIVE",
    comboGroupId: null,
  },
  {
    id: "i2",
    subtotal: "20.00",
    taxRate: "0",
    taxMode: "INCLUSIVE",
    comboGroupId: null,
  },
];

const insertReturning = (rows: unknown[]) => ({
  values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue(rows) })),
});
const insertPlain = () => ({ values: vi.fn().mockResolvedValue(undefined) });

const selectJoinRows = (rows: unknown[]) => ({
  from: vi.fn(() => ({
    innerJoin: vi.fn(() => ({ where: vi.fn().mockResolvedValue(rows) })),
  })),
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.transaction.mockImplementation(async (cb) => cb(tx));
  mocks.txOrderFindFirst.mockResolvedValue(baseOrder);
  mocks.txOrderFindMany.mockResolvedValue([]);
  mocks.txBillFindMany.mockResolvedValue([]);
  mocks.txItemFindMany.mockResolvedValue(activeItems);
  mocks.txItemFindFirst.mockResolvedValue(activeItems[0]);
  mocks.txPaymentFindFirst.mockResolvedValue(null);
  mocks.txDelete.mockReturnValue({ where: mocks.txDeleteWhere });
  mocks.txDeleteWhere.mockResolvedValue(undefined);
  mocks.txUpdate.mockReturnValue({ set: mocks.txUpdateSet });
  mocks.txUpdateSet.mockReturnValue({ where: mocks.txUpdateWhere });
  mocks.txUpdateWhere.mockReturnValue({ returning: vi.fn().mockResolvedValue([]) });
  mocks.dbOrderFindFirst.mockResolvedValue(baseOrder);
  mocks.dbBillFindMany.mockResolvedValue([{ id: "b1" }]);
  mocks.dbBillFindFirst.mockResolvedValue({ id: "b1", payments: [] });
  mocks.dbItemFindMany.mockResolvedValue(activeItems);
});

describe("billingRepository additional coverage", () => {
  it("covers splitOrderEvenly outcomes and successful replacement", async () => {
    mocks.txOrderFindFirst.mockResolvedValueOnce(undefined);
    await expect(billingRepository.splitOrderEvenly({ orderId: "o1", ways: 2, tenantId: "t1", branchId: "b1" })).resolves.toMatchObject({ status: "order_not_found" });

    mocks.txOrderFindFirst.mockResolvedValueOnce({ ...baseOrder, branchId: "b2" });
    await expect(billingRepository.splitOrderEvenly({ orderId: "o1", ways: 2, tenantId: "t1", branchId: "b1" })).resolves.toMatchObject({ status: "order_not_found" });

    mocks.txPaymentFindFirst.mockResolvedValueOnce({ id: "p1" });
    await expect(billingRepository.splitOrderEvenly({ orderId: "o1", ways: 2, tenantId: "t1", branchId: "b1" })).resolves.toMatchObject({ status: "already_paid" });

    mocks.txItemFindMany.mockResolvedValueOnce([activeItems[0]]);
    await expect(billingRepository.splitOrderEvenly({ orderId: "o1", ways: 2, tenantId: "t1", branchId: "b1" })).resolves.toMatchObject({ status: "too_many_bills" });

    mocks.txBillFindMany.mockResolvedValueOnce([{ id: "old1" }]);
    mocks.txInsert
      .mockReturnValueOnce(insertReturning([{ id: "b1" }, { id: "b2" }]))
      .mockReturnValueOnce(insertPlain());
    const result = await billingRepository.splitOrderEvenly({ orderId: "o1", ways: 2, tenantId: "t1", branchId: "b1" });
    expect(result).toMatchObject({ status: "ok", bills: [{ id: "b1" }, { id: "b2" }] });
    expect(mocks.txDelete).toHaveBeenCalledTimes(2);
  });

  it("covers splitOrderByItems validation/combo failures and success", async () => {
    mocks.txOrderFindFirst.mockResolvedValueOnce(undefined);
    await expect(billingRepository.splitOrderByItems({ orderId: "o1", allocations: [], tenantId: "t1", branchId: null })).resolves.toMatchObject({ status: "order_not_found" });

    mocks.txPaymentFindFirst.mockResolvedValueOnce({ id: "p1" });
    await expect(billingRepository.splitOrderByItems({ orderId: "o1", allocations: [{ orderItemIds: ["i1", "i2"] }], tenantId: "t1", branchId: null })).resolves.toMatchObject({ status: "already_paid" });

    await expect(billingRepository.splitOrderByItems({ orderId: "o1", allocations: [{ orderItemIds: [] }], tenantId: "t1", branchId: null })).resolves.toMatchObject({ status: "invalid_allocation", reason: "EMPTY_BILL" });

    mocks.txItemFindMany.mockResolvedValueOnce([
      { ...activeItems[0], id: "parent", comboGroupId: "c1" },
      { ...activeItems[1], id: "child", comboGroupId: "c1" },
    ]);
    await expect(billingRepository.splitOrderByItems({
      orderId: "o1",
      allocations: [{ orderItemIds: ["parent"] }, { orderItemIds: ["child"] }],
      tenantId: "t1",
      branchId: null,
    })).resolves.toMatchObject({ status: "invalid_allocation", reason: "SPLIT_COMBO_GROUP" });

    mocks.txBillFindMany.mockResolvedValueOnce([{ id: "old1" }]);
    mocks.txInsert
      .mockReturnValueOnce(insertReturning([{ id: "b1" }, { id: "b2" }]))
      .mockReturnValueOnce(insertPlain());
    const result = await billingRepository.splitOrderByItems({
      orderId: "o1",
      allocations: [{ label: "  A  ", orderItemIds: ["i1"] }, { orderItemIds: ["i2"] }],
      tenantId: "t1",
      branchId: null,
    });
    expect(result).toMatchObject({ status: "ok", bills: [{ id: "b1" }, { id: "b2" }] });
  });

  it("covers seat-share replacement outcomes and write paths", async () => {
    mocks.txOrderFindFirst.mockResolvedValueOnce(undefined);
    await expect(billingRepository.replaceSeatShares({ orderId: "o1", orderItemId: "i1", tenantId: "t1", branchId: null, shares: [] })).resolves.toMatchObject({ status: "order_not_found" });

    mocks.txItemFindFirst.mockResolvedValueOnce(undefined);
    await expect(billingRepository.replaceSeatShares({ orderId: "o1", orderItemId: "i1", tenantId: "t1", branchId: null, shares: [] })).resolves.toMatchObject({ status: "item_not_found" });

    mocks.txPaymentFindFirst.mockResolvedValueOnce({ id: "p1" });
    await expect(billingRepository.replaceSeatShares({ orderId: "o1", orderItemId: "i1", tenantId: "t1", branchId: null, shares: [] })).resolves.toMatchObject({ status: "already_paid" });

    await expect(billingRepository.replaceSeatShares({ orderId: "o1", orderItemId: "i1", tenantId: "t1", branchId: null, shares: [] })).resolves.toMatchObject({ status: "ok" });

    mocks.txInsert.mockReturnValueOnce(insertPlain());
    await expect(billingRepository.replaceSeatShares({
      orderId: "o1",
      orderItemId: "i1",
      tenantId: "t1",
      branchId: null,
      shares: [{ seatLabel: " Seat 1 ", shareRatio: 0.5 }, { seatLabel: "Seat 2", shareRatio: 0.5 }],
    })).resolves.toMatchObject({ status: "ok" });
  });

  it("covers splitOrderByShares validation/combo failures and success", async () => {
    mocks.txOrderFindFirst.mockResolvedValueOnce(undefined);
    await expect(billingRepository.splitOrderByShares({ orderId: "o1", allocations: [], tenantId: "t1", branchId: null })).resolves.toMatchObject({ status: "order_not_found" });

    mocks.txPaymentFindFirst.mockResolvedValueOnce({ id: "p1" });
    await expect(billingRepository.splitOrderByShares({ orderId: "o1", allocations: [], tenantId: "t1", branchId: null })).resolves.toMatchObject({ status: "already_paid" });

    await expect(billingRepository.splitOrderByShares({ orderId: "o1", allocations: [{ itemShares: [] }], tenantId: "t1", branchId: null })).resolves.toMatchObject({ status: "invalid_allocation", reason: "EMPTY_BILL" });

    mocks.txItemFindMany.mockResolvedValueOnce([
      { ...activeItems[0], id: "parent", comboGroupId: "c1" },
      { ...activeItems[1], id: "child", comboGroupId: "c1" },
    ]);
    await expect(billingRepository.splitOrderByShares({
      orderId: "o1",
      allocations: [
        { itemShares: [{ orderItemId: "parent", shareRatio: 1 }] },
        { itemShares: [{ orderItemId: "child", shareRatio: 1 }] },
      ],
      tenantId: "t1",
      branchId: null,
    })).resolves.toMatchObject({ status: "invalid_allocation", reason: "SPLIT_COMBO_GROUP" });

    mocks.txBillFindMany.mockResolvedValueOnce([{ id: "old" }]);
    mocks.txInsert
      .mockReturnValueOnce(insertReturning([{ id: "b1" }, { id: "b2" }]))
      .mockReturnValueOnce(insertPlain());
    const result = await billingRepository.splitOrderByShares({
      orderId: "o1",
      allocations: [
        { label: "A", itemShares: [{ orderItemId: "i1", shareRatio: 1 }] },
        { itemShares: [{ orderItemId: "i2", shareRatio: 1 }] },
      ],
      tenantId: "t1",
      branchId: null,
    });
    expect(result).toMatchObject({ status: "ok", bills: [{ id: "b1" }, { id: "b2" }] });
  });

  it("finds order bills and active seat-split items with branch scoping", async () => {
    mocks.dbOrderFindFirst.mockResolvedValueOnce(undefined);
    await expect(billingRepository.findBillsByOrder({ orderId: "o1", tenantId: "t1", branchId: "b1" })).resolves.toBeUndefined();
    mocks.dbOrderFindFirst.mockResolvedValueOnce({ ...baseOrder, branchId: "b2" });
    await expect(billingRepository.findActiveItemsForSeatSplit({ orderId: "o1", tenantId: "t1", branchId: "b1" })).resolves.toBeUndefined();

    await expect(billingRepository.findBillsByOrder({ orderId: "o1", tenantId: "t1", branchId: null })).resolves.toEqual({ bills: [{ id: "b1" }], orderBranchId: "b1" });
    await expect(billingRepository.findActiveItemsForSeatSplit({ orderId: "o1", tenantId: "t1", branchId: null })).resolves.toEqual({ orderBranchId: "b1", items: activeItems });
  });

  it("covers refund success, update race, and tenant-wide lookup", async () => {
    mocks.txSelect.mockReturnValueOnce(selectJoinRows([{ payment: { status: "SUCCESS", amount: "10.00" }, orderBranchId: "b1" }]));
    mocks.txUpdateWhere.mockReturnValueOnce({ returning: vi.fn().mockResolvedValue([]) });
    await expect(billingRepository.recordRefund({ paymentId: "p1", amount: 5, reason: "x", processedBy: "u1", tenantId: "t1", branchId: null })).resolves.toMatchObject({ status: "not_refundable" });

    mocks.txSelect.mockReturnValueOnce(selectJoinRows([{ payment: { status: "SUCCESS", amount: "10.00" }, orderBranchId: "b1" }]));
    mocks.txUpdateWhere.mockReturnValueOnce({ returning: vi.fn().mockResolvedValue([{ id: "p1" }]) });
    mocks.txInsert.mockReturnValueOnce(insertReturning([{ id: "r1", amount: "5.00" }]));
    await expect(billingRepository.recordRefund({ paymentId: "p1", amount: 5, reason: "x", processedBy: "u1", tenantId: "t1", branchId: null })).resolves.toMatchObject({ status: "ok", refund: { id: "r1" } });
  });

  it("covers bill lookup branch/no-branch and missing hydrated bill", async () => {
    const rows = [{ bill: { id: "b1" }, orderBranchId: "b1" }];
    mocks.dbSelect.mockReturnValueOnce(selectJoinRows(rows));
    await expect(billingRepository.findBillById({ billId: "b1", tenantId: "t1", branchId: "b1" })).resolves.toEqual({ bill: { id: "b1", payments: [] }, orderBranchId: "b1" });

    mocks.dbSelect.mockReturnValueOnce(selectJoinRows(rows));
    mocks.dbBillFindFirst.mockResolvedValueOnce(undefined);
    await expect(billingRepository.findBillById({ billId: "b1", tenantId: "t1", branchId: null })).resolves.toBeUndefined();

    mocks.dbSelect.mockReturnValueOnce(selectJoinRows([]));
    await expect(billingRepository.findBillById({ billId: "missing", tenantId: "t1", branchId: null })).resolves.toBeUndefined();
  });

  it("covers recordPayment merged-order, bill-selection, and due validation paths", async () => {
    const input = {
      orderId: "o1",
      method: "CARD" as const,
      amount: 3,
      tenantId: "t1",
      branchId: null,
      changedBy: "u1",
    };

    mocks.txOrderFindFirst
      .mockResolvedValueOnce({ ...baseOrder, mergedIntoOrderId: "parent" })
      .mockResolvedValueOnce(undefined);
    await expect(billingRepository.recordPayment(input)).resolves.toEqual({
      status: "order_not_found",
    });

    mocks.txBillFindMany.mockResolvedValueOnce([
      { id: "b1", totalAmount: "10.00" },
      { id: "b2", totalAmount: "10.00" },
    ]);
    await expect(billingRepository.recordPayment(input)).resolves.toEqual({
      status: "bill_required",
    });

    mocks.txBillFindMany.mockResolvedValueOnce([{ id: "b1", totalAmount: "10.00" }]);
    await expect(
      billingRepository.recordPayment({ ...input, billId: "missing" }),
    ).resolves.toEqual({ status: "bill_not_found" });

    mocks.txBillFindMany.mockResolvedValueOnce([{ id: "b1", totalAmount: "10.00" }]);
    mocks.txSelect.mockReturnValueOnce({
      from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ total: "8.00" }]) })),
    });
    await expect(billingRepository.recordPayment(input)).resolves.toEqual({
      status: "payment_exceeds_due",
      dueAmount: 2,
    });
  });

  it("assigns active items when recordPayment creates the first bill", async () => {
    mocks.txBillFindMany.mockResolvedValueOnce([]);
    mocks.txItemFindMany.mockResolvedValueOnce(activeItems);
    mocks.txInsert
      .mockReturnValueOnce(insertReturning([{ id: "new-bill", totalAmount: "34.00" }]))
      .mockReturnValueOnce(insertPlain())
      .mockReturnValueOnce(insertReturning([{ id: "p1", amount: "5.00", status: "SUCCESS" }]));
    mocks.txSelect
      .mockReturnValueOnce({
        from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ total: "0" }]) })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            groupBy: vi.fn().mockResolvedValue([{ billId: "new-bill", total: "5.00" }]),
          })),
        })),
      });

    const result = await billingRepository.recordPayment({
      orderId: "o1",
      method: "CASH",
      amount: 5,
      tenantId: "t1",
      branchId: "b1",
      changedBy: "u1",
    });
    expect(result).toMatchObject({ status: "ok", orderPaid: false });
    expect(mocks.txInsert).toHaveBeenCalledTimes(3);
  });

  it("settles a merged paid order, records status history, and releases tables", async () => {
    const child = {
      ...baseOrder,
      id: "child",
      mergedIntoOrderId: "parent",
      status: "BILL_REQUESTED",
      tableId: null,
    };
    const parent = {
      ...baseOrder,
      id: "parent",
      mergedIntoOrderId: null,
      status: "BILL_REQUESTED",
      tableId: "table1",
    };
    mocks.txOrderFindFirst
      .mockResolvedValueOnce(child)
      .mockResolvedValueOnce(parent);
    mocks.txOrderFindMany.mockResolvedValueOnce([child]);
    mocks.txBillFindMany.mockResolvedValueOnce([{ id: "bill1", totalAmount: "10.00" }]);
    mocks.txSelect
      .mockReturnValueOnce({
        from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ total: "0" }]) })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            groupBy: vi.fn().mockResolvedValue([
              { billId: "bill1", total: "10.00" },
              { billId: null, total: "999.00" },
            ]),
          })),
        })),
      });
    mocks.txInsert
      .mockReturnValueOnce(insertReturning([{ id: "p1", amount: "10.00", status: "SUCCESS" }]))
      .mockReturnValueOnce(insertPlain());

    const paidOrders = [
      { ...parent, status: "PAID" },
      { ...child, status: "PAID" },
    ];
    const orderUpdate = {
      set: vi.fn(() => ({
        where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue(paidOrders) })),
      })),
    };
    const tableUpdate = {
      set: vi.fn(() => ({
        where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: "table1", status: "AVAILABLE" }]) })),
      })),
    };
    mocks.txUpdate
      .mockReturnValueOnce(orderUpdate)
      .mockReturnValueOnce(tableUpdate);

    const result = await billingRepository.recordPayment({
      orderId: "child",
      billId: "bill1",
      method: "CARD",
      amount: 10,
      tenantId: "t1",
      branchId: "b1",
      changedBy: "u1",
    });

    expect(result).toMatchObject({
      status: "ok",
      orderPaid: true,
      order: { id: "parent", status: "PAID" },
      releasedTables: [{ id: "table1", status: "AVAILABLE" }],
    });
  });


  it("covers remaining repository branch fallbacks and branch-mismatch guards", async () => {
    const input = {
      orderId: "o1",
      method: "CARD" as const,
      amount: 0,
      tenantId: "t1",
      branchId: null,
      changedBy: "u1",
    };
    mocks.txBillFindMany.mockResolvedValueOnce([{ id: "b1", totalAmount: "10.00" }]);
    mocks.txSelect
      .mockReturnValueOnce({
        from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            groupBy: vi.fn().mockResolvedValue([{ billId: "b1", total: null }]),
          })),
        })),
      });
    mocks.txInsert.mockReturnValueOnce(
      insertReturning([{ id: "p-zero", amount: "0.00", status: "SUCCESS" }]),
    );
    await expect(billingRepository.recordPayment(input)).resolves.toMatchObject({
      status: "ok",
      orderPaid: false,
    });

    for (const operation of [
      () => billingRepository.splitOrderByItems({ orderId: "o1", allocations: [], tenantId: "t1", branchId: "b1" }),
      () => billingRepository.replaceSeatShares({ orderId: "o1", orderItemId: "i1", shares: [], tenantId: "t1", branchId: "b1" }),
      () => billingRepository.splitOrderByShares({ orderId: "o1", allocations: [], tenantId: "t1", branchId: "b1" }),
    ]) {
      mocks.txOrderFindFirst.mockResolvedValueOnce({ ...baseOrder, branchId: "b2" });
      await expect(operation()).resolves.toMatchObject({ status: "order_not_found" });
    }

    mocks.dbOrderFindFirst.mockResolvedValueOnce({ ...baseOrder, branchId: "b2" });
    await expect(
      billingRepository.findBillsByOrder({ orderId: "o1", tenantId: "t1", branchId: "b1" }),
    ).resolves.toBeUndefined();
  });

});
