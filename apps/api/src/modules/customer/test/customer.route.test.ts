import { beforeEach, describe, expect, it, vi } from "vitest";
import { Elysia } from "elysia";

const controller = vi.hoisted(() => ({
  createSession: vi.fn(),
  getMenu: vi.fn(),
  createOrder: vi.fn(),
  initiateTakeawayPayment: vi.fn(),
  verifyTakeawayPayment: vi.fn(),
  checkout: vi.fn(),
  getOrder: vi.fn(),
}));

vi.mock("@/modules/customer/customer.controller", () => ({
  customerController: controller,
}));

import { customerRouter } from "@/modules/customer/customer.route";

const handle = (path: string, init?: RequestInit) =>
  new Elysia()
    .use(customerRouter)
    .handle(new Request(`http://localhost${path}`, init));

const sessionHeaders = { "x-customer-session": "s1" };

const ids = {
  order: "00000000-0000-4000-8000-000000000001",
  tenant: "00000000-0000-4000-8000-000000000002",
  branch: "00000000-0000-4000-8000-000000000003",
  bill: "00000000-0000-4000-8000-000000000004",
  payment: "00000000-0000-4000-8000-000000000005",
} as const;

const orderEnvelope = {
  success: true as const,
  data: {
    id: ids.order,
    mergedIntoOrderId: null,
    tenantId: ids.tenant,
    branchId: ids.branch,
    tableId: null,
    table: null,
    customerId: null,
    customerGroupId: null,
    status: "OPEN" as const,
    type: "TAKEAWAY" as const,
    billingMode: "LINE_ITEMS" as const,
    coverCount: null,
    perCoverPriceRuleId: null,
    perCoverRate: null,
    subtotal: 0,
    taxAmount: 0,
    discountAmount: 0,
    serviceChargeAmount: 0,
    roundingAdjustment: 0,
    totalAmount: 0,
    notes: null,
    resolutionAsOf: null,
    items: [],
    kitchenTickets: [],
    statusHistory: [],
    payments: [],
    createdAt: "2026-09-18T00:00:00.000Z",
    updatedAt: "2026-09-18T00:00:00.000Z",
  },
};

describe("customerRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controller.createSession.mockResolvedValue({
      success: true,
      data: {
        sessionToken: "session-token",
        expiresAt: "2026-09-18T01:00:00.000Z",
        mode: "TAKEAWAY",
        restaurant: { id: ids.branch, name: "Main" },
        table: null,
      },
    });
    controller.getMenu.mockResolvedValue({
      success: true,
      data: {
        restaurant: { id: ids.branch, name: "Main", address: "Address" },
        mode: "TAKEAWAY",
        table: null,
        categories: [],
        combos: [],
        items: [],
      },
    });
    controller.createOrder.mockResolvedValue(orderEnvelope);
    controller.verifyTakeawayPayment.mockResolvedValue(orderEnvelope);
    controller.getOrder.mockResolvedValue(orderEnvelope);
    controller.initiateTakeawayPayment.mockResolvedValue({
      success: true,
      data: {
        id: ids.payment,
        amount: "10.00",
        reference: "ref",
        gatewayOrderId: "razorpay-order",
      },
    });
    controller.checkout.mockResolvedValue({
      success: true,
      data: {
        payment: {
          id: ids.payment,
          method: "CASH",
          status: "PENDING",
          amount: "10.00",
          reference: null,
        },
        orderStatus: "BILL_REQUESTED",
        paymentRequired: true,
        method: "CASH",
      },
    });
  });

  it("creates sessions", async () => {
    const response = await handle("/api/customer/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ qrToken: "qr1" }),
    });
    expect(response.status).toBe(201);
    expect(controller.createSession).toHaveBeenCalledWith("qr1");
  });

  it("serves the menu and rejects missing customer sessions", async () => {
    expect(
      (await handle("/api/customer/menu", { headers: sessionHeaders })).status,
    ).toBe(200);
    expect(controller.getMenu).toHaveBeenCalledWith("s1");
    expect((await handle("/api/customer/menu")).status).toBeGreaterThanOrEqual(
      400,
    );
  });

  it("creates orders with the optional customer request id", async () => {
    const response = await handle("/api/customer/orders", {
      method: "POST",
      headers: {
        ...sessionHeaders,
        "x-customer-request-id": "req1",
        "content-type": "application/json",
      },
      body: JSON.stringify({ notes: "note" }),
    });
    expect(response.status).toBe(201);
    expect(controller.createOrder).toHaveBeenCalledWith(
      "s1",
      { notes: "note" },
      "req1",
    );
    expect(
      (
        await handle("/api/customer/orders", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        })
      ).status,
    ).toBeGreaterThanOrEqual(400);
  });

  it("initiates and verifies takeaway payments", async () => {
    let response = await handle(
      `/api/customer/orders/${ids.order}/payment/initiate`,
      {
        method: "POST",
        headers: sessionHeaders,
      },
    );
    expect(response.status).toBe(201);
    expect(controller.initiateTakeawayPayment).toHaveBeenCalledWith(
      "s1",
      ids.order,
    );

    response = await handle(
      `/api/customer/orders/${ids.order}/payment/verify`,
      {
        method: "POST",
        headers: { ...sessionHeaders, "content-type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: "ro",
          razorpayPaymentId: "rp",
          razorpaySignature: "sig",
        }),
      },
    );
    expect(response.status).toBe(201);
    expect(controller.verifyTakeawayPayment).toHaveBeenCalledWith(
      "s1",
      ids.order,
      {
        razorpayOrderId: "ro",
        razorpayPaymentId: "rp",
        razorpaySignature: "sig",
      },
    );
  });

  it("checks out and retrieves customer orders", async () => {
    let response = await handle(`/api/customer/orders/${ids.order}/checkout`, {
      method: "POST",
      headers: { ...sessionHeaders, "content-type": "application/json" },
      body: JSON.stringify({ method: "CASH", billId: ids.bill }),
    });
    expect(response.status).toBe(201);
    expect(controller.checkout).toHaveBeenCalledWith("s1", {
      orderId: ids.order,
      method: "CASH",
      billId: ids.bill,
    });

    response = await handle(`/api/customer/orders/${ids.order}`, {
      headers: sessionHeaders,
    });
    expect(response.status).toBe(200);
    expect(controller.getOrder).toHaveBeenCalledWith("s1", ids.order);
  });

  it.each([
    [`/api/customer/orders/${ids.order}/payment/initiate`, { method: "POST" }],
    [
      `/api/customer/orders/${ids.order}/payment/verify`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: "ro",
          razorpayPaymentId: "rp",
          razorpaySignature: "sig",
        }),
      },
    ],
    [
      `/api/customer/orders/${ids.order}/checkout`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method: "CASH" }),
      },
    ],
    [`/api/customer/orders/${ids.order}`, undefined],
  ])("rejects missing session token on %s", async (path, init) => {
    expect(
      (await handle(path, init as RequestInit | undefined)).status,
    ).toBeGreaterThanOrEqual(400);
  });
});
