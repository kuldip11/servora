import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createPayment: vi.fn(),
  createRefund: vi.fn(),
  getBill: vi.fn(),
  splitOrder: vi.fn(),
  splitOrderByItems: vi.fn(),
  splitOrderBySeat: vi.fn(),
  setItemSeatShares: vi.fn(),
  getOrderBills: vi.fn(),
}));

vi.mock("../billing.service", () => ({
  billingService: mocks,
}));

import { billingController } from "@/modules/billing/billing.controller";

const orderId = "11111111-1111-4111-8111-111111111111";
const paymentId = "22222222-2222-4222-8222-222222222222";
const billId = "33333333-3333-4333-8333-333333333333";
const secondBillId = "44444444-4444-4444-8444-444444444444";
const thirdBillId = "55555555-5555-4555-8555-555555555555";
const refundId = "66666666-6666-4666-8666-666666666666";
const orderItemId = "77777777-7777-4777-8777-777777777777";
const now = new Date("2026-09-18T00:00:00.000Z");

const auth = {
  userId: "88888888-8888-4888-8888-888888888888",
  tenantId: "99999999-9999-4999-8999-999999999999",
  branchId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  email: "u@example.com",
  roles: [],
  permissions: [],
} as any;

const makeBill = (id: string) => ({
  id,
  orderId,
  splitLabel: null,
  subtotal: "100.00",
  taxAmount: "5.00",
  discountAmount: "0.00",
  serviceChargeAmount: "0.00",
  roundingAdjustment: "0.00",
  totalAmount: "105.00",
  gstNumber: null,
  createdAt: now,
});

const payment = {
  id: paymentId,
  orderId,
  billId,
  method: "CARD" as const,
  status: "SUCCESS" as const,
  amount: "105.00",
  reference: "ref-1",
  gatewayOrderId: null,
  gatewayPaymentId: null,
  metadata: "{}",
  createdAt: now,
  updatedAt: now,
};

const refund = {
  id: refundId,
  paymentId,
  amount: "5.00",
  reason: "return",
  processedBy: auth.userId,
  createdAt: now,
};

describe("billing controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createPayment.mockResolvedValue({
      payment,
      bill: makeBill(billId),
      paymentState: "PAID",
    });
    mocks.createRefund.mockResolvedValue(refund);
    mocks.getBill.mockResolvedValue(makeBill(billId));
    mocks.splitOrder.mockResolvedValue([
      makeBill(billId),
      makeBill(secondBillId),
    ]);
    mocks.splitOrderByItems.mockResolvedValue([makeBill(thirdBillId)]);
    mocks.splitOrderBySeat.mockResolvedValue({
      status: "CREATED",
      bills: [makeBill(thirdBillId)],
    });
    mocks.setItemSeatShares.mockResolvedValue([
      { seatLabel: "S1", shareRatio: 1 },
    ]);
    mocks.getOrderBills.mockResolvedValue([makeBill(billId)]);
  });

  it("delegates payment/refund creation and bill reads", async () => {
    await expect(
      billingController.createPayment(auth, {
        orderId,
        method: "CARD",
        amount: 10,
      }),
    ).resolves.toEqual({
      success: true,
      data: {
        payment: {
          id: paymentId,
          orderId,
          billId,
          method: "CARD",
          status: "SUCCESS",
          amount: 105,
          reference: "ref-1",
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
        bill: {
          id: billId,
          orderId,
          splitLabel: null,
          subtotal: 100,
          taxAmount: 5,
          discountAmount: 0,
          serviceChargeAmount: 0,
          roundingAdjustment: 0,
          totalAmount: 105,
          gstNumber: null,
          payments: [],
          createdAt: now.toISOString(),
        },
        paymentState: "PAID",
      },
    });
    await expect(
      billingController.createRefund(auth, {
        paymentId,
        amount: 5,
        reason: "return",
      }),
    ).resolves.toEqual({
      success: true,
      data: {
        id: refundId,
        paymentId,
        amount: 5,
        reason: "return",
        createdAt: now.toISOString(),
      },
    });
    await expect(billingController.getBill(auth, billId)).resolves.toEqual({
      success: true,
      data: {
        id: billId,
        orderId,
        splitLabel: null,
        subtotal: 100,
        taxAmount: 5,
        discountAmount: 0,
        serviceChargeAmount: 0,
        roundingAdjustment: 0,
        totalAmount: 105,
        gstNumber: null,
        payments: [],
        createdAt: now.toISOString(),
      },
    });
  });

  it("delegates all split and seat-share operations", async () => {
    const allocations = [{ label: "A", orderItemIds: [orderItemId] }];
    const shares = [{ seatLabel: "S1", shareRatio: 1 }];

    await expect(
      billingController.splitOrder(auth, orderId, 2),
    ).resolves.toMatchObject({
      success: true,
      data: [{ id: billId }, { id: secondBillId }],
    });
    await expect(
      billingController.splitOrderByItems(auth, orderId, allocations),
    ).resolves.toMatchObject({ success: true, data: [{ id: thirdBillId }] });
    await expect(
      billingController.splitOrderBySeat(auth, orderId, "MANUAL"),
    ).resolves.toMatchObject({
      success: true,
      data: { status: "CREATED", bills: [{ id: thirdBillId }] },
    });
    await expect(
      billingController.setItemSeatShares(auth, orderId, orderItemId, shares),
    ).resolves.toEqual({ success: true, data: shares });
    await expect(
      billingController.getOrderBills(auth, orderId),
    ).resolves.toMatchObject({
      success: true,
      data: [{ id: billId }],
    });

    expect(mocks.splitOrder).toHaveBeenCalledWith(auth, orderId, 2);
    expect(mocks.splitOrderByItems).toHaveBeenCalledWith(
      auth,
      orderId,
      allocations,
    );
    expect(mocks.splitOrderBySeat).toHaveBeenCalledWith(
      auth,
      orderId,
      "MANUAL",
    );
    expect(mocks.setItemSeatShares).toHaveBeenCalledWith(
      auth,
      orderId,
      orderItemId,
      shares,
    );
    expect(mocks.getOrderBills).toHaveBeenCalledWith(auth, orderId);
  });
});
