import { beforeEach, describe, expect, it, vi } from "vitest";

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
  buildFractional: vi.fn(),
  buildSeat: vi.fn(),
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
vi.mock("../../../core/audit", () => ({ writeAudit: mocks.writeAudit }));
vi.mock("../../../lib/event-bus", () => ({ eventBus: { publish: mocks.publish } }));
vi.mock("../../orders/order.repository", () => ({
  orderRepository: { findById: mocks.findOrder },
}));
vi.mock("../billing-split", () => ({
  buildFractionalSeatAllocationPlan: mocks.buildFractional,
  buildSeatAllocationPlan: mocks.buildSeat,
}));

import { billingService } from "@/modules/billing/billing.service";

const baseAuth = {
  userId: "u1",
  tenantId: "t1",
  branchId: "b1",
  tenantWide: false,
  email: "u@example.com",
  roles: [],
  permissions: ["billing:create", "billing:read", "billing:refund"],
  requestId: "req1",
  ipAddress: "127.0.0.1",
} as any;

const paymentOk = (overrides: Record<string, unknown> = {}) => ({
  status: "ok",
  bill: { id: "bill1" },
  payment: { id: "p1", status: "SUCCESS", amount: "10.00" },
  order: { id: "o1", status: "BILL_REQUESTED" },
  orderPaid: false,
  orderBranchId: "b1",
  ...overrides,
});

const splitOk = (overrides: Record<string, unknown> = {}) => ({
  status: "ok",
  orderBranchId: "b1",
  bills: [{ id: "bill1" }, { id: "bill2" }],
  ...overrides,
});

describe("billing service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.writeAudit.mockResolvedValue(undefined);
    mocks.publish.mockResolvedValue(undefined);
    mocks.findOrder.mockResolvedValue(null);
    mocks.recordPayment.mockResolvedValue(paymentOk());
    mocks.splitOrderEvenly.mockResolvedValue(splitOk());
    mocks.splitOrderByItems.mockResolvedValue(splitOk());
    mocks.findActiveItemsForSeatSplit.mockResolvedValue({ orderBranchId: "b1", items: [] });
    mocks.splitOrderByShares.mockResolvedValue(splitOk());
    mocks.replaceSeatShares.mockResolvedValue({ status: "ok", orderBranchId: "b1" });
    mocks.findBillsByOrder.mockResolvedValue({ orderBranchId: "b1", bills: [{ id: "bill1" }] });
    mocks.recordRefund.mockResolvedValue({ status: "ok", orderBranchId: "b1", refund: { id: "r1" } });
    mocks.findBillById.mockResolvedValue({ orderBranchId: "b1", bill: { id: "bill1" } });
    mocks.buildFractional.mockReturnValue(null);
    mocks.buildSeat.mockReturnValue({ status: "complete", allocations: [{ orderItemIds: ["oi1"] }] });
  });

  it("requires billing permissions", async () => {
    const auth = { ...baseAuth, permissions: [] };
    await expect(billingService.createPayment(auth, { orderId: "o1", method: "CARD", amount: 10 })).rejects.toThrow();
    await expect(billingService.splitOrder(auth, "o1", 2)).rejects.toThrow();
    await expect(billingService.getOrderBills(auth, "o1")).rejects.toThrow();
    await expect(billingService.createRefund(auth, { paymentId: "p1", amount: 1, reason: "x" })).rejects.toThrow();
  });

  it("maps every payment repository outcome", async () => {
    const input = { orderId: "o1", billId: "bill1", method: "CARD" as const, amount: 10 };
    mocks.recordPayment.mockResolvedValueOnce({ status: "order_not_found" });
    await expect(billingService.createPayment(baseAuth, input)).rejects.toMatchObject({ details: { reason: "ORDER_NOT_FOUND" } });
    mocks.recordPayment.mockResolvedValueOnce({ status: "bill_not_found" });
    await expect(billingService.createPayment(baseAuth, input)).rejects.toMatchObject({ details: { reason: "BILL_NOT_FOUND" } });
    mocks.recordPayment.mockResolvedValueOnce({ status: "bill_required" });
    await expect(billingService.createPayment(baseAuth, input)).rejects.toMatchObject({ details: { reason: "BILL_REQUIRED" } });
    mocks.recordPayment.mockResolvedValueOnce({ status: "payment_exceeds_due" });
    await expect(billingService.createPayment(baseAuth, input)).rejects.toMatchObject({ details: { reason: "PAYMENT_AMOUNT_EXCEEDS_DUE" } });
  });

  it("creates partial payments and publishes/audits them", async () => {
    await expect(billingService.createPayment(baseAuth, { orderId: "o1", method: "CARD", amount: 10 })).resolves.toMatchObject({ paymentState: "PARTIALLY_PAID" });
    expect(mocks.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "PAYMENT_CREATED", entityId: "p1" }));
    expect(mocks.publish).toHaveBeenCalledWith(expect.objectContaining({ type: "payment.updated" }), "t1", "b1");
  });

  it("publishes paid order and released tables when payment closes the order", async () => {
    mocks.recordPayment.mockResolvedValue(paymentOk({
      orderPaid: true,
      order: { id: "o1", status: "PAID" },
      releasedTables: [{ id: "table1" }, { id: "table2" }],
    }));
    mocks.findOrder.mockResolvedValue({ id: "o1", status: "PAID" });
    await expect(billingService.createPayment(baseAuth, { orderId: "o1", method: "CASH", amount: 10 })).resolves.toMatchObject({ paymentState: "PAID" });
    expect(mocks.publish).toHaveBeenCalledWith(expect.objectContaining({ type: "order.updated" }), "t1", "b1");
    expect(mocks.publish).toHaveBeenCalledWith(expect.objectContaining({ type: "table.updated", payload: { id: "table1" } }), "t1", "b1");
    expect(mocks.publish).toHaveBeenCalledWith(expect.objectContaining({ type: "table.updated", payload: { id: "table2" } }), "t1", "b1");
  });

  it("handles paid status without a refreshed order or released tables", async () => {
    mocks.recordPayment.mockResolvedValue(paymentOk({ orderPaid: true, order: { id: "o1", status: "PAID" }, releasedTables: undefined }));
    mocks.findOrder.mockResolvedValue(null);
    await expect(billingService.createPayment(baseAuth, { orderId: "o1", method: "CARD", amount: 10 })).resolves.toMatchObject({ paymentState: "PAID" });
  });

  it("enforces payment branch access", async () => {
    mocks.recordPayment.mockResolvedValue(paymentOk({ orderBranchId: "b2" }));
    await expect(billingService.createPayment(baseAuth, { orderId: "o1", method: "CARD", amount: 10 })).rejects.toThrow("Billing branch access denied");
  });

  it("maps split-even outcomes and audits successful splits", async () => {
    mocks.splitOrderEvenly.mockResolvedValueOnce({ status: "order_not_found" });
    await expect(billingService.splitOrder(baseAuth, "o1", 2)).rejects.toMatchObject({ details: { reason: "ORDER_NOT_FOUND" } });
    mocks.splitOrderEvenly.mockResolvedValueOnce({ status: "already_paid", orderBranchId: "b1" });
    await expect(billingService.splitOrder(baseAuth, "o1", 2)).rejects.toMatchObject({ details: { reason: "BILL_ALREADY_PAID" } });
    mocks.splitOrderEvenly.mockResolvedValueOnce({ status: "too_many_bills", orderBranchId: "b1" });
    await expect(billingService.splitOrder(baseAuth, "o1", 2)).rejects.toMatchObject({ details: { reason: "TOO_MANY_BILLS" } });
    mocks.splitOrderEvenly.mockResolvedValueOnce(splitOk());
    await expect(billingService.splitOrder(baseAuth, "o1", 2)).resolves.toHaveLength(2);
    expect(mocks.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "BILL_SPLIT", metadata: expect.objectContaining({ ways: 2 }) }));
  });

  it("maps split-by-item outcomes and audits success", async () => {
    const allocations = [{ label: "A", orderItemIds: ["oi1"] }];
    mocks.splitOrderByItems.mockResolvedValueOnce({ status: "order_not_found" });
    await expect(billingService.splitOrderByItems(baseAuth, "o1", allocations)).rejects.toMatchObject({ details: { reason: "ORDER_NOT_FOUND" } });
    mocks.splitOrderByItems.mockResolvedValueOnce({ status: "already_paid", orderBranchId: "b1" });
    await expect(billingService.splitOrderByItems(baseAuth, "o1", allocations)).rejects.toMatchObject({ details: { reason: "BILL_ALREADY_PAID" } });
    mocks.splitOrderByItems.mockResolvedValueOnce({ status: "invalid_allocation", reason: "EMPTY_BILL", orderBranchId: "b1" });
    await expect(billingService.splitOrderByItems(baseAuth, "o1", allocations)).rejects.toMatchObject({ details: { reason: "EMPTY_BILL" } });
    mocks.splitOrderByItems.mockResolvedValueOnce(splitOk());
    await expect(billingService.splitOrderByItems(baseAuth, "o1", allocations)).resolves.toHaveLength(2);
    expect(mocks.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ mode: "ITEM" }) }));
  });

  it("maps fractional seat-plan states and repository outcomes", async () => {
    mocks.findActiveItemsForSeatSplit.mockResolvedValueOnce(null);
    await expect(billingService.splitOrderBySeat(baseAuth, "o1", "EVEN_SPLIT")).rejects.toMatchObject({ details: { reason: "ORDER_NOT_FOUND" } });

    mocks.buildFractional.mockReturnValueOnce({ status: "no_seats" });
    await expect(billingService.splitOrderBySeat(baseAuth, "o1", "EVEN_SPLIT")).rejects.toMatchObject({ details: { reason: "NO_SEAT_LABELS" } });

    mocks.buildFractional.mockReturnValueOnce({ status: "manual_required", allocations: [{ label: "S1", orderItemIds: [] }], sharedItemIds: ["oi1"] });
    await expect(billingService.splitOrderBySeat(baseAuth, "o1", "MANUAL")).resolves.toMatchObject({ status: "MANUAL_REQUIRED", sharedItemIds: ["oi1"] });

    mocks.buildFractional.mockReturnValue({ status: "complete", allocations: [{ label: "S1", itemShares: [{ orderItemId: "oi1", shareRatio: 1 }] }] });
    mocks.splitOrderByShares.mockResolvedValueOnce({ status: "order_not_found" });
    await expect(billingService.splitOrderBySeat(baseAuth, "o1", "EVEN_SPLIT")).rejects.toMatchObject({ details: { reason: "ORDER_NOT_FOUND" } });
    mocks.splitOrderByShares.mockResolvedValueOnce({ status: "already_paid" });
    await expect(billingService.splitOrderBySeat(baseAuth, "o1", "EVEN_SPLIT")).rejects.toMatchObject({ details: { reason: "BILL_ALREADY_PAID" } });
    mocks.splitOrderByShares.mockResolvedValueOnce({ status: "invalid_allocation", reason: "UNKNOWN_ITEM" });
    await expect(billingService.splitOrderBySeat(baseAuth, "o1", "EVEN_SPLIT")).rejects.toMatchObject({ details: { reason: "UNKNOWN_ITEM" } });
    mocks.splitOrderByShares.mockResolvedValueOnce(splitOk());
    await expect(billingService.splitOrderBySeat(baseAuth, "o1", "EVEN_SPLIT")).resolves.toMatchObject({ status: "CREATED", bills: expect.any(Array) });
  });

  it("maps classic seat-plan states and delegates completed plans", async () => {
    mocks.buildFractional.mockReturnValue(null);
    mocks.buildSeat.mockReturnValueOnce({ status: "no_seats" });
    await expect(billingService.splitOrderBySeat(baseAuth, "o1", "EVEN_SPLIT")).rejects.toMatchObject({ details: { reason: "NO_SEAT_LABELS" } });

    mocks.buildSeat.mockReturnValueOnce({ status: "manual_required", allocations: [{ orderItemIds: [] }], sharedItemIds: ["oi1"] });
    await expect(billingService.splitOrderBySeat(baseAuth, "o1", "MANUAL")).resolves.toMatchObject({ status: "MANUAL_REQUIRED" });

    mocks.buildSeat.mockReturnValueOnce({ status: "complete", allocations: [{ orderItemIds: ["oi1"] }] });
    mocks.splitOrderByItems.mockResolvedValueOnce(splitOk());
    await expect(billingService.splitOrderBySeat(baseAuth, "o1", "EVEN_SPLIT")).resolves.toMatchObject({ status: "CREATED", bills: expect.any(Array) });
  });

  it("validates item seat shares before persistence", async () => {
    await expect(billingService.setItemSeatShares(baseAuth, "o1", "oi1", [])).rejects.toMatchObject({ details: { reason: "EMPTY_BILL" } });
    await expect(billingService.setItemSeatShares(baseAuth, "o1", "oi1", [
      { seatLabel: "A", shareRatio: 0.5 }, { seatLabel: " a ", shareRatio: 0.5 },
    ])).rejects.toMatchObject({ details: { reason: "DUPLICATE_ITEM" } });
    for (const shares of [
      [{ seatLabel: "", shareRatio: 1 }],
      [{ seatLabel: "A", shareRatio: Number.NaN }],
      [{ seatLabel: "A", shareRatio: 0 }],
      [{ seatLabel: "A", shareRatio: 1.1 }],
      [{ seatLabel: "A", shareRatio: 0.4 }, { seatLabel: "B", shareRatio: 0.4 }],
    ]) {
      await expect(billingService.setItemSeatShares(baseAuth, "o1", "oi1", shares)).rejects.toMatchObject({ details: { reason: "INVALID_RATIO" } });
    }
  });

  it("maps seat-share persistence outcomes and audits success", async () => {
    const shares = [{ seatLabel: "A", shareRatio: 1 }];
    mocks.replaceSeatShares.mockResolvedValueOnce({ status: "order_not_found" });
    await expect(billingService.setItemSeatShares(baseAuth, "o1", "oi1", shares)).rejects.toMatchObject({ details: { reason: "ORDER_NOT_FOUND" } });
    mocks.replaceSeatShares.mockResolvedValueOnce({ status: "item_not_found", orderBranchId: "b1" });
    await expect(billingService.setItemSeatShares(baseAuth, "o1", "oi1", shares)).rejects.toMatchObject({ details: { reason: "UNKNOWN_ITEM" } });
    mocks.replaceSeatShares.mockResolvedValueOnce({ status: "already_paid", orderBranchId: "b1" });
    await expect(billingService.setItemSeatShares(baseAuth, "o1", "oi1", shares)).rejects.toMatchObject({ details: { reason: "BILL_ALREADY_PAID" } });
    mocks.replaceSeatShares.mockResolvedValueOnce({ status: "ok", orderBranchId: "b1" });
    await expect(billingService.setItemSeatShares(baseAuth, "o1", "oi1", shares)).resolves.toEqual(shares);
    expect(mocks.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "ORDER_ITEM_SEAT_SHARES_UPDATED", entityId: "oi1" }));
  });

  it("gets order bills with ownership checks", async () => {
    mocks.findBillsByOrder.mockResolvedValueOnce(null);
    await expect(billingService.getOrderBills(baseAuth, "o1")).rejects.toMatchObject({ details: { reason: "ORDER_NOT_FOUND" } });
    mocks.findBillsByOrder.mockResolvedValueOnce({ orderBranchId: "b1", bills: [{ id: "b1" }] });
    await expect(billingService.getOrderBills(baseAuth, "o1")).resolves.toEqual([{ id: "b1" }]);
  });

  it("maps refund outcomes and audits successful refunds", async () => {
    const input = { paymentId: "p1", amount: 5, reason: "return" };
    mocks.recordRefund.mockResolvedValueOnce({ status: "payment_not_found" });
    await expect(billingService.createRefund(baseAuth, input)).rejects.toMatchObject({ details: { reason: "PAYMENT_NOT_FOUND" } });
    mocks.recordRefund.mockResolvedValueOnce({ status: "not_refundable", orderBranchId: "b1" });
    await expect(billingService.createRefund(baseAuth, input)).rejects.toMatchObject({ details: { reason: "PAYMENT_NOT_REFUNDABLE" } });
    mocks.recordRefund.mockResolvedValueOnce({ status: "exceeds_amount", orderBranchId: "b1" });
    await expect(billingService.createRefund(baseAuth, input)).rejects.toMatchObject({ details: { reason: "REFUND_AMOUNT_EXCEEDS_PAYMENT" } });
    mocks.recordRefund.mockResolvedValueOnce({ status: "ok", orderBranchId: "b1", refund: { id: "r1" } });
    await expect(billingService.createRefund(baseAuth, input)).resolves.toEqual({ id: "r1" });
    expect(mocks.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "REFUND_CREATED", entityId: "r1" }));
  });

  it("gets bills by id and maps missing bills", async () => {
    mocks.findBillById.mockResolvedValueOnce(undefined);
    await expect(billingService.getBill(baseAuth, "bill1")).rejects.toMatchObject({ details: { reason: "BILL_NOT_FOUND" } });
    mocks.findBillById.mockResolvedValueOnce({ orderBranchId: "b1", bill: { id: "bill1" } });
    await expect(billingService.getBill(baseAuth, "bill1")).resolves.toEqual({ id: "bill1" });
  });
});
