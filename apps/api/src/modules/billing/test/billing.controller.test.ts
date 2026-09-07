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

const auth = {
  userId: "u1",
  tenantId: "t1",
  branchId: "b1",
  email: "u@example.com",
  roles: [],
  permissions: [],
} as any;

describe("billing controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createPayment.mockResolvedValue({
      payment: { id: "p1" },
      bill: { id: "b1" },
    });
    mocks.createRefund.mockResolvedValue({ id: "r1" });
    mocks.getBill.mockResolvedValue({ id: "b1" });
    mocks.splitOrder.mockResolvedValue([{ id: "b1" }, { id: "b2" }]);
    mocks.splitOrderByItems.mockResolvedValue([{ id: "b3" }]);
    mocks.splitOrderBySeat.mockResolvedValue([{ id: "b4" }]);
    mocks.setItemSeatShares.mockResolvedValue({ id: "oi1", seatShares: [] });
    mocks.getOrderBills.mockResolvedValue([{ id: "b1" }]);
  });

  it("delegates payment/refund creation and bill reads", async () => {
    await expect(
      billingController.createPayment(auth, {
        orderId: "o1",
        method: "CARD",
        amount: 10,
      }),
    ).resolves.toEqual({
      success: true,
      data: { payment: { id: "p1" }, bill: { id: "b1" } },
    });
    await expect(
      billingController.createRefund(auth, {
        paymentId: "p1",
        amount: 5,
        reason: "return",
      }),
    ).resolves.toEqual({ success: true, data: { id: "r1" } });
    await expect(billingController.getBill(auth, "b1")).resolves.toEqual({
      success: true,
      data: { id: "b1" },
    });
  });

  it("delegates all split and seat-share operations", async () => {
    const allocations = [{ label: "A", orderItemIds: ["oi1"] }];
    const shares = [{ seatLabel: "S1", shareRatio: 1 }];

    await expect(billingController.splitOrder(auth, "o1", 2)).resolves.toEqual({
      success: true,
      data: [{ id: "b1" }, { id: "b2" }],
    });
    await expect(
      billingController.splitOrderByItems(auth, "o1", allocations),
    ).resolves.toEqual({ success: true, data: [{ id: "b3" }] });
    await expect(
      billingController.splitOrderBySeat(auth, "o1", "MANUAL"),
    ).resolves.toEqual({ success: true, data: [{ id: "b4" }] });
    await expect(
      billingController.setItemSeatShares(auth, "o1", "oi1", shares),
    ).resolves.toEqual({ success: true, data: { id: "oi1", seatShares: [] } });
    await expect(billingController.getOrderBills(auth, "o1")).resolves.toEqual({
      success: true,
      data: [{ id: "b1" }],
    });

    expect(mocks.splitOrder).toHaveBeenCalledWith(auth, "o1", 2);
    expect(mocks.splitOrderByItems).toHaveBeenCalledWith(
      auth,
      "o1",
      allocations,
    );
    expect(mocks.splitOrderBySeat).toHaveBeenCalledWith(auth, "o1", "MANUAL");
    expect(mocks.setItemSeatShares).toHaveBeenCalledWith(
      auth,
      "o1",
      "oi1",
      shares,
    );
    expect(mocks.getOrderBills).toHaveBeenCalledWith(auth, "o1");
  });
});
