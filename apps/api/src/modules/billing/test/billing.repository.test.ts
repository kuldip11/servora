import { beforeEach, describe, expect, it, vi } from "vitest";

const { tx, db } = vi.hoisted(() => {
  const tx = {
    execute: vi.fn(),
    query: {
      paymentCollectionRequests: { findFirst: vi.fn() },
      orders: { findFirst: vi.fn(), findMany: vi.fn() },
      bills: { findFirst: vi.fn(), findMany: vi.fn() },
      orderItems: { findMany: vi.fn() },
      payments: { findFirst: vi.fn() },
    },
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  const db = { transaction: vi.fn(async (fn: any) => fn(tx)), select: vi.fn() };
  return { tx, db };
});
vi.mock("../../../db", () => ({ db }));

import { billingRepository } from "@/modules/billing/billing.repository";

const returning = (rows: any[]) => vi.fn().mockResolvedValue(rows);
beforeEach(() => {
  vi.clearAllMocks();
  tx.query.orders.findFirst.mockReset();
  tx.query.orders.findMany.mockReset();
  tx.query.orders.findMany.mockResolvedValue([]);
  tx.query.bills.findFirst.mockReset();
  tx.query.bills.findMany.mockReset();
  tx.query.orderItems.findMany.mockReset();
  tx.insert.mockReset();
  tx.update.mockReset();
  tx.select.mockReset();
  db.select.mockReset();
});

describe("billing repository", () => {
  it("returns order_not_found when the order is absent or outside the branch", async () => {
    tx.query.orders.findFirst.mockResolvedValue(undefined);
    await expect(
      billingRepository.recordPayment({
        orderId: "o1",
        method: "CARD",
        amount: 10,
        tenantId: "t1",
        branchId: "b1",
        changedBy: "u1",
      }),
    ).resolves.toEqual({ status: "order_not_found" });
    tx.query.orders.findFirst.mockResolvedValue({ id: "o1", branchId: "b2" });
    await expect(
      billingRepository.recordPayment({
        orderId: "o1",
        method: "CARD",
        amount: 10,
        tenantId: "t1",
        branchId: "b1",
        changedBy: "u1",
      }),
    ).resolves.toEqual({ status: "order_not_found" });
  });

  it("creates a bill when needed and records a successful payment", async () => {
    const order = {
      id: "o1",
      branchId: "b1",
      subtotal: "10.00",
      taxAmount: "1.00",
      discountAmount: "0.00",
      totalAmount: "11.00",
    };
    const bill = { id: "b1" };
    const payment = { id: "p1", amount: "10.00", status: "SUCCESS" };
    tx.query.orders.findFirst.mockResolvedValue(order);
    tx.query.bills.findMany.mockResolvedValue([]);
    tx.query.orderItems.findMany.mockResolvedValue([]);
    tx.insert
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({ returning: returning([bill]) }),
      })
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({ returning: returning([payment]) }),
      });
    const selectResult = (rows: any[]) => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue(rows),
          then: (resolve: any) => resolve(rows),
        }),
      }),
    });
    tx.select
      .mockReturnValueOnce(selectResult([{ total: "0" }]))
      .mockReturnValueOnce(selectResult([{ total: "10.00" }]));
    await expect(
      billingRepository.recordPayment({
        orderId: "o1",
        method: "CARD",
        amount: 10,
        reference: "ref",
        tenantId: "t1",
        branchId: "b1",
        changedBy: "u1",
      }),
    ).resolves.toEqual({
      status: "ok",
      orderBranchId: "b1",
      bill,
      payment,
      order,
      orderPaid: false,
    });
  });

  it("returns refund status outcomes before mutating the payment", async () => {
    tx.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi
          .fn()
          .mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      }),
    });
    await expect(
      billingRepository.recordRefund({
        paymentId: "p1",
        amount: 5,
        reason: "return",
        processedBy: "u1",
        tenantId: "t1",
        branchId: "b1",
      }),
    ).resolves.toEqual({ status: "payment_not_found" });
    tx.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              payment: { status: "PENDING", amount: "10.00" },
              orderBranchId: "b1",
            },
          ]),
        }),
      }),
    });
    await expect(
      billingRepository.recordRefund({
        paymentId: "p1",
        amount: 5,
        reason: "return",
        processedBy: "u1",
        tenantId: "t1",
        branchId: "b1",
      }),
    ).resolves.toEqual({ status: "not_refundable", orderBranchId: "b1" });
    tx.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              payment: { status: "SUCCESS", amount: "10.00" },
              orderBranchId: "b1",
            },
          ]),
        }),
      }),
    });
    await expect(
      billingRepository.recordRefund({
        paymentId: "p1",
        amount: 11,
        reason: "return",
        processedBy: "u1",
        tenantId: "t1",
        branchId: "b1",
      }),
    ).resolves.toEqual({ status: "exceeds_amount", orderBranchId: "b1" });
  });
});
