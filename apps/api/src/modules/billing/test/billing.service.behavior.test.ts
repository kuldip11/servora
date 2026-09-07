import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "@/core/auth";

const mocks = vi.hoisted(() => ({
  recordPayment: vi.fn(),
  splitOrderEvenly: vi.fn(),
  splitOrderByItems: vi.fn(),
  findActiveItemsForSeatSplit: vi.fn(),
  splitOrderByShares: vi.fn(),
  replaceSeatShares: vi.fn(),
  findBillsByOrder: vi.fn(),
  recordRefund: vi.fn(),
  findBillById: vi.fn(),
  writeAudit: vi.fn(),
  publish: vi.fn(),
  findOrder: vi.fn(),
  assertAccess: vi.fn(),
  requirePermission: vi.fn(),
  fractionalPlan: vi.fn(),
  seatPlan: vi.fn(),
}));

vi.mock("../billing.repository", () => ({
  billingRepository: {
    recordPayment: mocks.recordPayment,
    splitOrderEvenly: mocks.splitOrderEvenly,
    splitOrderByItems: mocks.splitOrderByItems,
    findActiveItemsForSeatSplit: mocks.findActiveItemsForSeatSplit,
    splitOrderByShares: mocks.splitOrderByShares,
    replaceSeatShares: mocks.replaceSeatShares,
    findBillsByOrder: mocks.findBillsByOrder,
    recordRefund: mocks.recordRefund,
    findBillById: mocks.findBillById,
  },
}));
vi.mock("@/core/audit", () => ({ writeAudit: mocks.writeAudit }));
vi.mock("@/lib/event-bus", () => ({ eventBus: { publish: mocks.publish } }));
vi.mock("@/modules/orders/order.repository", () => ({
  orderRepository: { findById: mocks.findOrder },
}));
vi.mock("../billing-authorization", () => ({
  assertBillingResourceAccess: mocks.assertAccess,
  requireBillingPermission: mocks.requirePermission,
}));
vi.mock("../billing-split", () => ({
  buildFractionalSeatAllocationPlan: mocks.fractionalPlan,
  buildSeatAllocationPlan: mocks.seatPlan,
}));

import { billingService } from "../billing.service";

const auth = {
  userId: "u1",
  tenantId: "t1",
  email: "user@example.com",
  branchId: "b1",
  tenantWide: false,
  roles: [],
  permissions: [],
  requestId: "req1",
  ipAddress: "127.0.0.1",
} as AuthContext;

const okPayment = {
  status: "ok",
  orderBranchId: "b1",
  bill: { id: "bill1" },
  payment: { id: "p1", status: "SUCCESS", amount: "10.00" },
  order: { id: "o1", status: "OPEN" },
  orderPaid: false,
  releasedTables: [],
};

describe("billingService coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.recordPayment.mockResolvedValue(okPayment);
    mocks.splitOrderEvenly.mockResolvedValue({ status: "ok", orderBranchId: "b1", bills: [{ id: "b1" }, { id: "b2" }] });
    mocks.splitOrderByItems.mockResolvedValue({ status: "ok", orderBranchId: "b1", bills: [{ id: "b1" }] });
    mocks.findActiveItemsForSeatSplit.mockResolvedValue({ orderBranchId: "b1", items: [{ id: "i1" }] });
    mocks.splitOrderByShares.mockResolvedValue({ status: "ok", orderBranchId: "b1", bills: [{ id: "b1" }] });
    mocks.replaceSeatShares.mockResolvedValue({ status: "ok", orderBranchId: "b1" });
    mocks.findBillsByOrder.mockResolvedValue({ orderBranchId: "b1", bills: [{ id: "b1" }] });
    mocks.recordRefund.mockResolvedValue({ status: "ok", orderBranchId: "b1", refund: { id: "r1" } });
    mocks.findBillById.mockResolvedValue({ orderBranchId: "b1", bill: { id: "b1" } });
    mocks.writeAudit.mockResolvedValue(undefined);
    mocks.publish.mockResolvedValue(undefined);
    mocks.findOrder.mockResolvedValue(null);
    mocks.fractionalPlan.mockReturnValue(null);
    mocks.seatPlan.mockReturnValue({ status: "complete", allocations: [{ label: "Seat 1", orderItemIds: ["i1"] }] });
  });

  it("maps all payment repository failure statuses", async () => {
    mocks.recordPayment.mockResolvedValueOnce({ status: "order_not_found" });
    await expect(billingService.createPayment(auth, { orderId: "o1", method: "CASH", amount: 10 })).rejects.toMatchObject({ details: { reason: "ORDER_NOT_FOUND" } });

    mocks.recordPayment.mockResolvedValueOnce({ status: "bill_not_found" });
    await expect(billingService.createPayment(auth, { orderId: "o1", billId: "bill-x", method: "CASH", amount: 10 })).rejects.toMatchObject({ details: { reason: "BILL_NOT_FOUND" } });

    mocks.recordPayment.mockResolvedValueOnce({ status: "bill_required" });
    await expect(billingService.createPayment(auth, { orderId: "o1", method: "CASH", amount: 10 })).rejects.toMatchObject({ details: { reason: "BILL_REQUIRED" } });

    mocks.recordPayment.mockResolvedValueOnce({ status: "payment_exceeds_due" });
    await expect(billingService.createPayment(auth, { orderId: "o1", method: "CASH", amount: 10 })).rejects.toMatchObject({ details: { reason: "PAYMENT_AMOUNT_EXCEEDS_DUE" } });
  });

  it("creates partial and fully-paid payments, audits, and publishes order/table releases", async () => {
    const partial = await billingService.createPayment(auth, { orderId: "o1", method: "CARD", amount: 10, reference: "ref" });
    expect(partial.paymentState).toBe("PARTIALLY_PAID");
    expect(mocks.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: "payment.updated", payload: expect.objectContaining({ amount: 10 }) }),
      "t1",
      "b1",
    );

    vi.clearAllMocks();
    mocks.recordPayment.mockResolvedValue({
      ...okPayment,
      orderPaid: true,
      order: { id: "o1", status: "PAID" },
      releasedTables: [{ id: "table1" }, { id: "table2" }],
    });
    mocks.findOrder.mockResolvedValue({ id: "o1", status: "PAID" });
    mocks.writeAudit.mockResolvedValue(undefined);
    mocks.publish.mockResolvedValue(undefined);

    const paid = await billingService.createPayment(auth, { orderId: "o1", method: "CASH", amount: 10 });
    expect(paid.paymentState).toBe("PAID");
    expect(mocks.publish).toHaveBeenCalledWith(expect.objectContaining({ type: "order.updated" }), "t1", "b1");
    expect(mocks.publish).toHaveBeenCalledWith(expect.objectContaining({ type: "table.updated" }), "t1", "b1");
  });

  it("handles paid result when refreshed order is absent and released tables default missing", async () => {
    mocks.recordPayment.mockResolvedValue({
      ...okPayment,
      orderPaid: true,
      order: { id: "o1", status: "PAID" },
      releasedTables: undefined,
    });
    mocks.findOrder.mockResolvedValue(null);
    await expect(billingService.createPayment(auth, { orderId: "o1", method: "CASH", amount: 10 })).resolves.toMatchObject({ paymentState: "PAID" });
    expect(mocks.publish).toHaveBeenCalledTimes(1);
  });

  it("maps even split outcomes and audits success", async () => {
    for (const [status, reason] of [
      ["order_not_found", "ORDER_NOT_FOUND"],
      ["already_paid", "BILL_ALREADY_PAID"],
      ["too_many_bills", "TOO_MANY_BILLS"],
    ] as const) {
      mocks.splitOrderEvenly.mockResolvedValueOnce({ status, orderBranchId: "b1" });
      await expect(billingService.splitOrder(auth, "o1", 2)).rejects.toMatchObject({ details: expect.objectContaining({ reason }) });
    }
    mocks.splitOrderEvenly.mockResolvedValueOnce({ status: "ok", orderBranchId: "b1", bills: [{ id: "b1" }] });
    await expect(billingService.splitOrder(auth, "o1", 2)).resolves.toEqual([{ id: "b1" }]);
    expect(mocks.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "BILL_SPLIT", metadata: { ways: 2, billIds: ["b1"] } }));
  });

  it("maps item split outcomes and audits success", async () => {
    mocks.splitOrderByItems.mockResolvedValueOnce({ status: "order_not_found" });
    await expect(billingService.splitOrderByItems(auth, "o1", [])).rejects.toMatchObject({ details: { reason: "ORDER_NOT_FOUND" } });
    mocks.splitOrderByItems.mockResolvedValueOnce({ status: "already_paid", orderBranchId: "b1" });
    await expect(billingService.splitOrderByItems(auth, "o1", [])).rejects.toMatchObject({ details: { reason: "BILL_ALREADY_PAID" } });
    mocks.splitOrderByItems.mockResolvedValueOnce({ status: "invalid_allocation", orderBranchId: "b1", reason: "UNKNOWN_ITEM" });
    await expect(billingService.splitOrderByItems(auth, "o1", [])).rejects.toMatchObject({ details: { reason: "UNKNOWN_ITEM" } });
    const allocations = [{ label: "A", orderItemIds: ["i1"] }];
    mocks.splitOrderByItems.mockResolvedValueOnce({ status: "ok", orderBranchId: "b1", bills: [{ id: "b1" }] });
    await expect(billingService.splitOrderByItems(auth, "o1", allocations)).resolves.toEqual([{ id: "b1" }]);
  });

  it("handles fractional seat plans: no seats, manual, repository failures, and created bills", async () => {
    mocks.findActiveItemsForSeatSplit.mockResolvedValueOnce(null);
    await expect(billingService.splitOrderBySeat(auth, "missing", "EVEN_SPLIT")).rejects.toMatchObject({ details: { reason: "ORDER_NOT_FOUND" } });

    mocks.fractionalPlan.mockReturnValueOnce({ status: "no_seats" });
    await expect(billingService.splitOrderBySeat(auth, "o1", "EVEN_SPLIT")).rejects.toMatchObject({ details: { reason: "NO_SEAT_LABELS" } });

    mocks.fractionalPlan.mockReturnValueOnce({ status: "manual_required", allocations: [{ label: "S1", orderItemIds: [] }], sharedItemIds: ["i1"] });
    await expect(billingService.splitOrderBySeat(auth, "o1", "MANUAL")).resolves.toEqual({ status: "MANUAL_REQUIRED", allocations: [{ label: "S1", orderItemIds: [] }], sharedItemIds: ["i1"] });

    for (const result of [
      { status: "order_not_found" },
      { status: "already_paid", orderBranchId: "b1" },
      { status: "invalid_allocation", orderBranchId: "b1", reason: "SPLIT_COMBO_GROUP" },
    ]) {
      mocks.fractionalPlan.mockReturnValueOnce({ status: "complete", allocations: [{ label: "S1", shares: [] }] });
      mocks.splitOrderByShares.mockResolvedValueOnce(result);
      await expect(billingService.splitOrderBySeat(auth, "o1", "EVEN_SPLIT")).rejects.toThrow();
    }

    mocks.fractionalPlan.mockReturnValueOnce({ status: "complete", allocations: [{ label: "S1", shares: [] }] });
    mocks.splitOrderByShares.mockResolvedValueOnce({ status: "ok", bills: [{ id: "b1" }] });
    await expect(billingService.splitOrderBySeat(auth, "o1", "EVEN_SPLIT")).resolves.toEqual({ status: "CREATED", bills: [{ id: "b1" }] });
  });

  it("handles classic seat plans: no seats, manual, and complete delegating to item split", async () => {
    mocks.fractionalPlan.mockReturnValue(null);
    mocks.seatPlan.mockReturnValueOnce({ status: "no_seats" });
    await expect(billingService.splitOrderBySeat(auth, "o1", "EVEN_SPLIT")).rejects.toMatchObject({ details: { reason: "NO_SEAT_LABELS" } });

    mocks.seatPlan.mockReturnValueOnce({ status: "manual_required", allocations: [], sharedItemIds: ["i1"] });
    await expect(billingService.splitOrderBySeat(auth, "o1", "MANUAL")).resolves.toEqual({ status: "MANUAL_REQUIRED", allocations: [], sharedItemIds: ["i1"] });

    mocks.seatPlan.mockReturnValueOnce({ status: "complete", allocations: [{ label: "S1", orderItemIds: ["i1"] }] });
    mocks.splitOrderByItems.mockResolvedValueOnce({ status: "ok", orderBranchId: "b1", bills: [{ id: "b1" }] });
    await expect(billingService.splitOrderBySeat(auth, "o1", "EVEN_SPLIT")).resolves.toEqual({ status: "CREATED", bills: [{ id: "b1" }] });
  });

  it("validates item seat shares and maps repository outcomes", async () => {
    const invalidCases = [
      [],
      [{ seatLabel: "A", shareRatio: 0.5 }, { seatLabel: " a ", shareRatio: 0.5 }],
      [{ seatLabel: "", shareRatio: 1 }],
      [{ seatLabel: "A", shareRatio: Number.NaN }],
      [{ seatLabel: "A", shareRatio: 0 }],
      [{ seatLabel: "A", shareRatio: 2 }],
      [{ seatLabel: "A", shareRatio: 0.5 }],
    ];
    for (const shares of invalidCases) {
      await expect(billingService.setItemSeatShares(auth, "o1", "i1", shares as any)).rejects.toThrow();
    }

    for (const result of [
      { status: "order_not_found" },
      { status: "item_not_found", orderBranchId: "b1" },
      { status: "already_paid", orderBranchId: "b1" },
    ]) {
      mocks.replaceSeatShares.mockResolvedValueOnce(result);
      await expect(billingService.setItemSeatShares(auth, "o1", "i1", [{ seatLabel: "A", shareRatio: 1 }])).rejects.toThrow();
    }

    const shares = [{ seatLabel: "A", shareRatio: 1 }];
    mocks.replaceSeatShares.mockResolvedValueOnce({ status: "ok", orderBranchId: "b1" });
    await expect(billingService.setItemSeatShares(auth, "o1", "i1", shares)).resolves.toBe(shares);
    expect(mocks.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "ORDER_ITEM_SEAT_SHARES_UPDATED" }));
  });

  it("gets order bills and maps missing order", async () => {
    mocks.findBillsByOrder.mockResolvedValueOnce(null);
    await expect(billingService.getOrderBills(auth, "o1")).rejects.toMatchObject({ details: { reason: "ORDER_NOT_FOUND" } });
    mocks.findBillsByOrder.mockResolvedValueOnce({ orderBranchId: "b1", bills: [{ id: "b1" }] });
    await expect(billingService.getOrderBills(auth, "o1")).resolves.toEqual([{ id: "b1" }]);
  });

  it("maps refund outcomes and returns audited refund", async () => {
    mocks.recordRefund.mockResolvedValueOnce({ status: "payment_not_found" });
    await expect(billingService.createRefund(auth, { paymentId: "p1", amount: 1, reason: "x" })).rejects.toMatchObject({ details: { reason: "PAYMENT_NOT_FOUND" } });
    mocks.recordRefund.mockResolvedValueOnce({ status: "not_refundable", orderBranchId: "b1" });
    await expect(billingService.createRefund(auth, { paymentId: "p1", amount: 1, reason: "x" })).rejects.toMatchObject({ details: { reason: "PAYMENT_NOT_REFUNDABLE" } });
    mocks.recordRefund.mockResolvedValueOnce({ status: "exceeds_amount", orderBranchId: "b1" });
    await expect(billingService.createRefund(auth, { paymentId: "p1", amount: 1, reason: "x" })).rejects.toMatchObject({ details: { reason: "REFUND_AMOUNT_EXCEEDS_PAYMENT" } });
    mocks.recordRefund.mockResolvedValueOnce({ status: "ok", orderBranchId: "b1", refund: { id: "r1" } });
    await expect(billingService.createRefund(auth, { paymentId: "p1", amount: 1, reason: "x" })).resolves.toEqual({ id: "r1" });
  });

  it("gets bill and maps missing bill", async () => {
    mocks.findBillById.mockResolvedValueOnce(null);
    await expect(billingService.getBill(auth, "b1")).rejects.toMatchObject({ details: { reason: "BILL_NOT_FOUND" } });
    mocks.findBillById.mockResolvedValueOnce({ orderBranchId: "b1", bill: { id: "b1" } });
    await expect(billingService.getBill(auth, "b1")).resolves.toEqual({ id: "b1" });
  });
});
