import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { tx, db } = vi.hoisted(() => {
  const tx = {
    execute: vi.fn(),
    query: {
      paymentCollectionRequests: { findFirst: vi.fn() },
      orders: { findFirst: vi.fn(), findMany: vi.fn() },
      bills: { findFirst: vi.fn(), findMany: vi.fn() },
      orderItems: { findFirst: vi.fn(), findMany: vi.fn() },
      payments: { findFirst: vi.fn() },
    },
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const db = {
    transaction: vi.fn(async (fn: any) => fn(tx)),
    query: {
      orders: { findFirst: vi.fn() },
      bills: { findFirst: vi.fn(), findMany: vi.fn() },
      orderItems: { findMany: vi.fn() },
    },
    select: vi.fn(),
  };
  return { tx, db };
});

vi.mock("../../../db", () => ({ db }));

import { billingRepository } from "@/modules/billing/billing.repository";

const order = {
  id: "o1",
  tenantId: "t1",
  branchId: "br1",
  tableId: null,
  mergedIntoOrderId: null,
  status: "OPEN",
  subtotal: "20.00",
  taxAmount: "2.00",
  discountAmount: "1.00",
  serviceChargeAmount: "0.50",
  roundingAdjustment: "0.00",
  totalAmount: "21.50",
};
const items = [
  {
    id: "i1",
    orderId: "o1",
    subtotal: "10.00",
    taxMode: "EXCLUSIVE",
    taxRate: "10",
    comboGroupId: null,
  },
  {
    id: "i2",
    orderId: "o1",
    subtotal: "10.00",
    taxMode: "INCLUSIVE",
    taxRate: "0",
    comboGroupId: null,
  },
];

const returningChain = (rows: any[]) => ({
  returning: vi.fn().mockResolvedValue(rows),
});
const valuesChain = (rows: any[]) => ({
  values: vi.fn().mockReturnValue(returningChain(rows)),
});
const deleteChain = () => ({ where: vi.fn().mockResolvedValue(undefined) });

beforeEach(() => {
  vi.clearAllMocks();
  tx.query.orders.findFirst.mockResolvedValue(order);
  tx.query.orders.findMany.mockResolvedValue([]);
  tx.query.bills.findMany.mockResolvedValue([]);
  tx.query.orderItems.findMany.mockResolvedValue(items);
  tx.query.orderItems.findFirst.mockResolvedValue(items[0]);
  tx.query.payments.findFirst.mockResolvedValue(undefined);
  tx.query.paymentCollectionRequests.findFirst.mockResolvedValue(undefined);
  tx.delete.mockImplementation(() => deleteChain());
  db.query.orders.findFirst.mockResolvedValue(order);
  db.query.bills.findMany.mockResolvedValue([]);
  db.query.orderItems.findMany.mockResolvedValue(items);
  db.query.bills.findFirst.mockResolvedValue({ id: "b1", payments: [] });
});

describe("billing repository coverage", () => {
  it("rejects branchless repository writes before entering a transaction", async () => {
    const base = { orderId: "o1", tenantId: "t1", branchId: null };
    const operations = [
      () =>
        billingRepository.recordPayment({
          ...base,
          method: "CASH",
          amount: 1,
          changedBy: "u1",
        }),
      () =>
        billingRepository.recordRefund({
          paymentId: "p1",
          tenantId: "t1",
          branchId: null,
          amount: 1,
          reason: "x",
          processedBy: "u1",
        }),
      () => billingRepository.splitOrderEvenly({ ...base, ways: 2 }),
      () => billingRepository.splitOrderByItems({ ...base, allocations: [] }),
      () => billingRepository.splitOrderByShares({ ...base, allocations: [] }),
      () =>
        billingRepository.replaceSeatShares({
          ...base,
          orderItemId: "i1",
          shares: [],
        }),
    ];
    for (const operation of operations)
      await expect(operation()).rejects.toThrow("Billing branch access denied");
    expect(db.transaction).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("rejects a merged billing order in another branch before any mutation", async () => {
    tx.query.orders.findFirst
      .mockResolvedValueOnce({ ...order, mergedIntoOrderId: "parent" })
      .mockResolvedValueOnce({ ...order, id: "parent", branchId: "other" });
    await expect(
      billingRepository.recordPayment({
        orderId: "o1",
        tenantId: "t1",
        branchId: "br1",
        method: "CASH",
        amount: 1,
        changedBy: "u1",
      }),
    ).rejects.toThrow("Billing branch access denied");
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("checks the resolved refund branch inside the transaction before changing payment state", async () => {
    tx.select.mockReturnValueOnce({
      from: () => ({
        innerJoin: () => ({
          where: vi.fn().mockResolvedValue([
            {
              payment: { id: "p1", status: "SUCCESS", amount: "10.00" },
              orderBranchId: "other",
            },
          ]),
        }),
      }),
    });
    await expect(
      billingRepository.recordRefund({
        paymentId: "p1",
        tenantId: "t1",
        branchId: "br1",
        amount: 1,
        reason: "x",
        processedBy: "u1",
      }),
    ).rejects.toThrow("Billing branch access denied");
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("does not read bills or balances until the canonical order lock is acquired", async () => {
    let release!: () => void;
    tx.execute.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    tx.query.bills.findMany.mockResolvedValueOnce([{ id: "b1" }, { id: "b2" }]);
    const result = billingRepository.recordPayment({
      orderId: "o1",
      tenantId: "t1",
      branchId: "br1",
      method: "CASH",
      amount: 1,
      changedBy: "u1",
    });
    await vi.waitFor(() => expect(tx.execute).toHaveBeenCalledOnce());
    expect(tx.query.bills.findMany).not.toHaveBeenCalled();
    expect(tx.select).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
    release();
    await expect(result).resolves.toEqual({ status: "bill_required" });
  });

  it("persists a new request's association with its payment in the transaction", async () => {
    tx.query.bills.findMany.mockResolvedValue([
      { id: "b1", totalAmount: "21.50" },
    ]);
    const requestValues = vi.fn().mockResolvedValue(undefined);
    tx.insert
      .mockReturnValueOnce(
        valuesChain([
          { id: "p-new", billId: "b1", amount: "5.00", status: "SUCCESS" },
        ]),
      )
      .mockReturnValueOnce({ values: requestValues });
    tx.select.mockImplementation(() => ({
      from: () => ({
        where: () =>
          Object.assign(Promise.resolve([{ total: "0" }]), {
            groupBy: () => Promise.resolve([{ billId: "b1", total: "5.00" }]),
          }),
      }),
    }));
    await expect(
      billingRepository.recordPayment({
        orderId: "o1",
        billId: "b1",
        tenantId: "t1",
        branchId: "br1",
        method: "CASH",
        amount: 5,
        changedBy: "u1",
        idempotencyKey: "request-new",
      }),
    ).resolves.toMatchObject({ status: "ok", payment: { id: "p-new" } });
    expect(requestValues).toHaveBeenCalledWith({
      orderId: "o1",
      requestKey: "request-new",
      paymentId: "p-new",
      requestFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  it("rejects even a one-cent overpayment against the locked balance", async () => {
    tx.query.bills.findMany.mockResolvedValue([
      { id: "b1", totalAmount: "21.50" },
    ]);
    tx.select.mockReturnValueOnce({
      from: () => ({ where: () => Promise.resolve([{ total: "16.50" }]) }),
    });
    await expect(
      billingRepository.recordPayment({
        orderId: "o1",
        billId: "b1",
        tenantId: "t1",
        branchId: "br1",
        method: "CASH",
        amount: 5.01,
        changedBy: "u1",
      }),
    ).resolves.toEqual({ status: "payment_exceeds_due", dueAmount: 5 });
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("replays the original payment without another insert and rejects changed retry details", async () => {
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          billId: "b1",
          amount: "5.00",
          method: "CASH",
          reference: null,
        }),
      )
      .digest("hex");
    const previous = {
      id: "p1",
      billId: "b1",
      amount: "5.00",
      status: "SUCCESS",
      requestFingerprint: fingerprint,
    };
    tx.query.paymentCollectionRequests.findFirst.mockResolvedValue({
      paymentId: "p1",
      requestFingerprint: fingerprint,
    });
    tx.query.payments.findFirst.mockResolvedValue(previous);
    tx.query.bills.findMany.mockResolvedValue([
      { id: "b1", totalAmount: "21.50" },
    ]);
    tx.select.mockImplementation(() => ({
      from: () => ({
        where: () =>
          Object.assign(Promise.resolve([{ total: "5.00" }]), {
            groupBy: () => Promise.resolve([{ billId: "b1", total: "5.00" }]),
          }),
      }),
    }));
    const input = {
      orderId: "o1",
      billId: "b1",
      tenantId: "t1",
      branchId: "br1",
      method: "CASH" as const,
      amount: 5,
      changedBy: "u1",
      idempotencyKey: "request-1",
    };
    await expect(billingRepository.recordPayment(input)).resolves.toMatchObject(
      { status: "ok", payment: previous, replayed: true },
    );
    await expect(
      billingRepository.recordPayment({ ...input, amount: 6 }),
    ).resolves.toEqual({ status: "idempotency_conflict" });
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("covers even split missing, paid, too-many and successful replacement", async () => {
    tx.query.orders.findFirst.mockResolvedValueOnce(undefined);
    await expect(
      billingRepository.splitOrderEvenly({
        orderId: "o1",
        ways: 2,
        tenantId: "t1",
        branchId: "br1",
      }),
    ).resolves.toEqual({ status: "order_not_found" });

    tx.query.payments.findFirst.mockResolvedValueOnce({ id: "p1" });
    await expect(
      billingRepository.splitOrderEvenly({
        orderId: "o1",
        ways: 2,
        tenantId: "t1",
        branchId: null,
        tenantWide: true,
      }),
    ).resolves.toMatchObject({ status: "already_paid" });

    tx.query.orderItems.findMany.mockResolvedValueOnce([items[0]]);
    await expect(
      billingRepository.splitOrderEvenly({
        orderId: "o1",
        ways: 2,
        tenantId: "t1",
        branchId: null,
        tenantWide: true,
      }),
    ).resolves.toMatchObject({ status: "too_many_bills" });

    tx.query.bills.findMany.mockResolvedValueOnce([{ id: "old" }]);
    tx.insert
      .mockReturnValueOnce(valuesChain([{ id: "b1" }, { id: "b2" }]))
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue(undefined) });
    await expect(
      billingRepository.splitOrderEvenly({
        orderId: "o1",
        ways: 2,
        tenantId: "t1",
        branchId: null,
        tenantWide: true,
      }),
    ).resolves.toMatchObject({
      status: "ok",
      bills: [{ id: "b1" }, { id: "b2" }],
    });
    expect(tx.delete).toHaveBeenCalledTimes(2);
  });

  it("covers item allocation validation and successful item split", async () => {
    const base = {
      orderId: "o1",
      tenantId: "t1",
      branchId: null,
      tenantWide: true,
    };
    await expect(
      billingRepository.splitOrderByItems({
        ...base,
        allocations: [{ label: "A", orderItemIds: ["i1"] }],
      }),
    ).resolves.toMatchObject({ status: "invalid_allocation" });

    tx.query.bills.findMany.mockResolvedValueOnce([{ id: "old" }]);
    tx.insert
      .mockReturnValueOnce(valuesChain([{ id: "b1" }, { id: "b2" }]))
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue(undefined) });
    const allocations = [
      { label: " First ", orderItemIds: ["i1"] },
      { label: "", orderItemIds: ["i2"] },
    ];
    await expect(
      billingRepository.splitOrderByItems({ ...base, allocations }),
    ).resolves.toMatchObject({
      status: "ok",
      bills: [{ id: "b1" }, { id: "b2" }],
    });
  });

  it("covers seat-share replacement outcomes", async () => {
    const base = {
      orderId: "o1",
      orderItemId: "i1",
      tenantId: "t1",
      branchId: null,
      tenantWide: true,
      shares: [] as Array<{ seatLabel: string; shareRatio: number }>,
    };
    tx.query.orders.findFirst.mockResolvedValueOnce(undefined);
    await expect(billingRepository.replaceSeatShares(base)).resolves.toEqual({
      status: "order_not_found",
    });

    tx.query.orderItems.findFirst.mockResolvedValueOnce(undefined);
    await expect(
      billingRepository.replaceSeatShares(base),
    ).resolves.toMatchObject({ status: "item_not_found" });

    tx.query.payments.findFirst.mockResolvedValueOnce({ id: "p1" });
    await expect(
      billingRepository.replaceSeatShares(base),
    ).resolves.toMatchObject({ status: "already_paid" });

    tx.insert.mockReturnValueOnce({
      values: vi.fn().mockResolvedValue(undefined),
    });
    await expect(
      billingRepository.replaceSeatShares({
        ...base,
        shares: [{ seatLabel: " A ", shareRatio: 1 }],
      }),
    ).resolves.toMatchObject({ status: "ok" });
  });

  it("covers fractional split validation and success", async () => {
    const base = {
      orderId: "o1",
      tenantId: "t1",
      branchId: null,
      tenantWide: true,
    };
    await expect(
      billingRepository.splitOrderByShares({
        ...base,
        allocations: [
          { label: "A", itemShares: [{ orderItemId: "i1", shareRatio: 1 }] },
        ],
      }),
    ).resolves.toMatchObject({ status: "invalid_allocation" });

    tx.insert
      .mockReturnValueOnce(valuesChain([{ id: "b1" }, { id: "b2" }]))
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue(undefined) });
    const allocations = [
      { label: "A", itemShares: [{ orderItemId: "i1", shareRatio: 1 }] },
      { label: "B", itemShares: [{ orderItemId: "i2", shareRatio: 1 }] },
    ];
    await expect(
      billingRepository.splitOrderByShares({ ...base, allocations }),
    ).resolves.toMatchObject({
      status: "ok",
      bills: [{ id: "b1" }, { id: "b2" }],
    });
  });

  it("covers bill/order and active-seat lookup scopes", async () => {
    db.query.orders.findFirst.mockResolvedValueOnce(undefined);
    await expect(
      billingRepository.findBillsByOrder({
        orderId: "o1",
        tenantId: "t1",
        branchId: null,
        tenantWide: true,
      }),
    ).resolves.toBeUndefined();

    db.query.bills.findMany.mockResolvedValueOnce([{ id: "b1" }]);
    await expect(
      billingRepository.findBillsByOrder({
        orderId: "o1",
        tenantId: "t1",
        branchId: "br1",
      }),
    ).resolves.toEqual({ bills: [{ id: "b1" }], orderBranchId: "br1" });

    db.query.orders.findFirst.mockResolvedValueOnce({
      ...order,
      branchId: "other",
    });
    await expect(
      billingRepository.findActiveItemsForSeatSplit({
        orderId: "o1",
        tenantId: "t1",
        branchId: "br1",
      }),
    ).resolves.toBeUndefined();
    await expect(
      billingRepository.findActiveItemsForSeatSplit({
        orderId: "o1",
        tenantId: "t1",
        branchId: null,
        tenantWide: true,
      }),
    ).resolves.toEqual({ orderBranchId: "br1", items });
  });

  it("covers successful refund including concurrent non-refundable update", async () => {
    const row = {
      payment: { id: "p1", status: "SUCCESS", amount: "10.00" },
      orderBranchId: "br1",
    };
    const selectRows = (rows: any[]) => ({
      from: vi.fn().mockReturnValue({
        innerJoin: vi
          .fn()
          .mockReturnValue({ where: vi.fn().mockResolvedValue(rows) }),
      }),
    });
    tx.select.mockReturnValue(selectRows([row]));
    tx.update.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(returningChain([])),
      }),
    });
    const input = {
      paymentId: "p1",
      amount: 5,
      reason: "return",
      processedBy: "u1",
      tenantId: "t1",
      branchId: null,
      tenantWide: true,
    };
    await expect(billingRepository.recordRefund(input)).resolves.toEqual({
      status: "not_refundable",
      orderBranchId: "br1",
    });

    tx.update.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi
          .fn()
          .mockReturnValue(returningChain([{ id: "p1", status: "REFUNDED" }])),
      }),
    });
    tx.insert.mockReturnValueOnce(valuesChain([{ id: "r1" }]));
    await expect(
      billingRepository.recordRefund({ ...input, branchId: "br1" }),
    ).resolves.toEqual({
      status: "ok",
      orderBranchId: "br1",
      refund: { id: "r1" },
    });
  });

  it("covers bill lookup absent, missing hydration, and success", async () => {
    const selected = (rows: any[]) => ({
      from: vi.fn().mockReturnValue({
        innerJoin: vi
          .fn()
          .mockReturnValue({ where: vi.fn().mockResolvedValue(rows) }),
      }),
    });
    db.select.mockReturnValueOnce(selected([]));
    await expect(
      billingRepository.findBillById({
        billId: "b1",
        tenantId: "t1",
        branchId: null,
        tenantWide: true,
      }),
    ).resolves.toBeUndefined();

    db.select.mockReturnValueOnce(
      selected([{ bill: { id: "b1" }, orderBranchId: "br1" }]),
    );
    db.query.bills.findFirst.mockResolvedValueOnce(undefined);
    await expect(
      billingRepository.findBillById({
        billId: "b1",
        tenantId: "t1",
        branchId: "br1",
      }),
    ).resolves.toBeUndefined();

    db.select.mockReturnValueOnce(
      selected([{ bill: { id: "b1" }, orderBranchId: "br1" }]),
    );
    db.query.bills.findFirst.mockResolvedValueOnce({ id: "b1", payments: [] });
    await expect(
      billingRepository.findBillById({
        billId: "b1",
        tenantId: "t1",
        branchId: null,
        tenantWide: true,
      }),
    ).resolves.toEqual({
      bill: { id: "b1", payments: [] },
      orderBranchId: "br1",
    });
  });

  it("covers merged-order selection, bill selection errors, overpayment, and active-item assignment", async () => {
    const input = {
      orderId: "child",
      method: "CARD" as const,
      amount: 5,
      tenantId: "t1",
      branchId: null,
      tenantWide: true,
      changedBy: "u1",
    };
    tx.query.orders.findFirst
      .mockResolvedValueOnce({
        ...order,
        id: "child",
        mergedIntoOrderId: "parent",
      })
      .mockResolvedValueOnce(undefined);
    await expect(billingRepository.recordPayment(input)).resolves.toEqual({
      status: "order_not_found",
    });

    tx.query.orders.findFirst.mockResolvedValue(order);
    tx.query.bills.findMany.mockResolvedValueOnce([
      { id: "b1", totalAmount: "10.00" },
      { id: "b2", totalAmount: "10.00" },
    ]);
    await expect(
      billingRepository.recordPayment({ ...input, orderId: "o1" }),
    ).resolves.toEqual({ status: "bill_required" });

    tx.query.bills.findMany.mockResolvedValueOnce([
      { id: "b1", totalAmount: "10.00" },
    ]);
    await expect(
      billingRepository.recordPayment({
        ...input,
        orderId: "o1",
        billId: "missing",
      }),
    ).resolves.toEqual({ status: "bill_not_found" });

    const selectRows = (rows: any[]) => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue(rows),
          then: (resolve: any) => resolve(rows),
        }),
      }),
    });
    tx.query.bills.findMany.mockResolvedValueOnce([
      { id: "b1", totalAmount: "10.00" },
    ]);
    tx.select.mockReturnValueOnce(selectRows([{ total: "9.00" }]));
    await expect(
      billingRepository.recordPayment({ ...input, orderId: "o1", amount: 2 }),
    ).resolves.toEqual({ status: "payment_exceeds_due", dueAmount: 1 });

    tx.query.bills.findMany.mockResolvedValueOnce([]);
    tx.query.orderItems.findMany.mockResolvedValueOnce(items);
    tx.insert
      .mockReturnValueOnce(valuesChain([{ id: "new", totalAmount: "21.50" }]))
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue(undefined) })
      .mockReturnValueOnce(valuesChain([{ id: "p1", status: "SUCCESS" }]));
    tx.select
      .mockReturnValueOnce(selectRows([{ total: "0" }]))
      .mockReturnValueOnce(selectRows([{ billId: "new", total: "5.00" }]));
    await expect(
      billingRepository.recordPayment({ ...input, orderId: "o1" }),
    ).resolves.toMatchObject({ status: "ok", orderPaid: false });
  });

  it("marks combined bill-requested orders paid and releases their tables", async () => {
    const billingOrder = {
      ...order,
      status: "BILL_REQUESTED",
      tableId: "t1table",
      totalAmount: "10.00",
    };
    const merged = {
      ...order,
      id: "o2",
      status: "BILL_REQUESTED",
      tableId: "t2table",
      totalAmount: "0.00",
    };
    const bill = { id: "b1", orderId: "o1", totalAmount: "10.00" };
    const payment = {
      id: "p1",
      billId: "b1",
      amount: "10.00",
      status: "SUCCESS",
    };
    tx.query.orders.findFirst.mockResolvedValue(billingOrder);
    tx.query.orders.findMany.mockResolvedValue([merged]);
    tx.query.bills.findMany.mockResolvedValue([bill]);
    const selectRows = (rows: any[]) => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue(rows),
          then: (resolve: any) => resolve(rows),
        }),
      }),
    });
    tx.select
      .mockReturnValueOnce(selectRows([{ total: "0" }]))
      .mockReturnValueOnce(selectRows([{ billId: "b1", total: "10.00" }]));
    tx.insert
      .mockReturnValueOnce(valuesChain([payment]))
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue(undefined) });
    const paid1 = { ...billingOrder, status: "PAID" };
    const paid2 = { ...merged, status: "PAID" };
    tx.update
      .mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(returningChain([paid1, paid2])),
        }),
      })
      .mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockReturnValue(
              returningChain([{ id: "t1table", status: "AVAILABLE" }]),
            ),
        }),
      })
      .mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockReturnValue(
              returningChain([{ id: "t2table", status: "AVAILABLE" }]),
            ),
        }),
      });
    await expect(
      billingRepository.recordPayment({
        orderId: "o1",
        method: "CASH",
        amount: 10,
        tenantId: "t1",
        branchId: "br1",
        changedBy: "u1",
      }),
    ).resolves.toMatchObject({
      status: "ok",
      orderPaid: true,
      order: paid1,
      releasedTables: [
        { id: "t1table", status: "AVAILABLE" },
        { id: "t2table", status: "AVAILABLE" },
      ],
    });
  });

  it("covers paid and combo-allocation failures for item and share splitting", async () => {
    const base = {
      orderId: "o1",
      tenantId: "t1",
      branchId: null,
      tenantWide: true,
    };
    tx.query.payments.findFirst.mockResolvedValueOnce({ id: "p1" });
    await expect(
      billingRepository.splitOrderByItems({ ...base, allocations: [] }),
    ).resolves.toMatchObject({ status: "already_paid" });

    const comboItems = items.map((item) => ({
      ...item,
      comboGroupId: "combo1",
    }));
    tx.query.orderItems.findMany.mockResolvedValueOnce(comboItems);
    await expect(
      billingRepository.splitOrderByItems({
        ...base,
        allocations: [
          { label: "A", orderItemIds: ["i1"] },
          { label: "B", orderItemIds: ["i2"] },
        ],
      }),
    ).resolves.toMatchObject({
      status: "invalid_allocation",
      reason: "SPLIT_COMBO_GROUP",
    });

    tx.query.payments.findFirst.mockResolvedValueOnce({ id: "p1" });
    await expect(
      billingRepository.splitOrderByShares({ ...base, allocations: [] }),
    ).resolves.toMatchObject({ status: "already_paid" });

    tx.query.orderItems.findMany.mockResolvedValueOnce(comboItems);
    await expect(
      billingRepository.splitOrderByShares({
        ...base,
        allocations: [
          { label: "A", itemShares: [{ orderItemId: "i1", shareRatio: 1 }] },
          { label: "B", itemShares: [{ orderItemId: "i2", shareRatio: 1 }] },
        ],
      }),
    ).resolves.toMatchObject({
      status: "invalid_allocation",
      reason: "SPLIT_COMBO_GROUP",
    });
  });

  it("deletes old bills during fractional split replacement", async () => {
    tx.query.bills.findMany.mockResolvedValueOnce([{ id: "old" }]);
    tx.insert
      .mockReturnValueOnce(valuesChain([{ id: "b1" }, { id: "b2" }]))
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue(undefined) });
    await expect(
      billingRepository.splitOrderByShares({
        orderId: "o1",
        tenantId: "t1",
        branchId: null,
        tenantWide: true,
        allocations: [
          { label: "A", itemShares: [{ orderItemId: "i1", shareRatio: 1 }] },
          { label: "B", itemShares: [{ orderItemId: "i2", shareRatio: 1 }] },
        ],
      }),
    ).resolves.toMatchObject({ status: "ok" });
    expect(tx.delete).toHaveBeenCalledTimes(2);
  });
});
