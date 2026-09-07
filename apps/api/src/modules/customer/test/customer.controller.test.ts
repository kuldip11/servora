import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({
  createSession: vi.fn(),
  getMenu: vi.fn(),
  createOrder: vi.fn(),
  verifyTakeawayPayment: vi.fn(),
  getSession: vi.fn(),
  initiateTakeawayPayment: vi.fn(),
  checkout: vi.fn(),
  getOrder: vi.fn(),
}));

vi.mock("@/modules/customer/customer.service", () => ({
  customerService: service,
}));

import { customerController } from "@/modules/customer/customer.controller";

describe("customerController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wraps session, menu, order, checkout and order lookups", async () => {
    service.createSession.mockResolvedValue({ token: "s1" });
    service.getMenu.mockResolvedValue({ items: [] });
    service.createOrder.mockResolvedValue({ id: "o1" });
    service.checkout.mockResolvedValue({ id: "p1" });
    service.getOrder.mockResolvedValue({ id: "o1" });

    await expect(customerController.createSession("qr")).resolves.toEqual({
      success: true,
      data: { token: "s1" },
    });
    await expect(customerController.getMenu("s1")).resolves.toEqual({
      success: true,
      data: { items: [] },
    });
    await customerController.createOrder("s1", { items: [] } as never, "req1");
    expect(service.createOrder).toHaveBeenCalledWith("s1", { items: [] }, "req1");
    await customerController.checkout("s1", { orderId: "o1", method: "CASH" });
    expect(service.checkout).toHaveBeenCalledWith("s1", {
      orderId: "o1",
      method: "CASH",
    });
    await customerController.getOrder("s1", "o1");
    expect(service.getOrder).toHaveBeenCalledWith("s1", "o1");
  });

  it("passes the route order id into takeaway verification", async () => {
    service.verifyTakeawayPayment.mockResolvedValue({ ok: true });
    const input = {
      razorpayOrderId: "rp-order",
      razorpayPaymentId: "rp-payment",
      razorpaySignature: "sig",
    };
    await customerController.verifyTakeawayPayment("s1", "o1", input);
    expect(service.verifyTakeawayPayment).toHaveBeenCalledWith("s1", {
      ...input,
      orderId: "o1",
    });
  });

  it("initiates takeaway payment only for takeaway sessions", async () => {
    service.getSession.mockResolvedValue({
      mode: "TAKEAWAY",
      tenantId: "t1",
      branchId: "b1",
    });
    service.initiateTakeawayPayment.mockResolvedValue({ id: "rp1" });
    await customerController.initiateTakeawayPayment("s1", "o1");
    expect(service.initiateTakeawayPayment).toHaveBeenCalledWith("t1", "b1", "o1");

    service.getSession.mockResolvedValue({
      mode: "DINE_IN",
      tenantId: "t1",
      branchId: "b1",
    });
    await expect(
      customerController.initiateTakeawayPayment("s1", "o1"),
    ).rejects.toThrow("Online payment is only required for takeaway orders");
  });
});
