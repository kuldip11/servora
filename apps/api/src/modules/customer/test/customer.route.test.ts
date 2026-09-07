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
  new Elysia().use(customerRouter).handle(
    new Request(`http://localhost${path}`, init),
  );

const sessionHeaders = { "x-customer-session": "s1" };

describe("customerRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const mock of Object.values(controller)) mock.mockResolvedValue({ ok: true });
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
    expect((await handle("/api/customer/menu", { headers: sessionHeaders })).status).toBe(200);
    expect(controller.getMenu).toHaveBeenCalledWith("s1");
    expect((await handle("/api/customer/menu")).status).toBeGreaterThanOrEqual(400);
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
      (await handle("/api/customer/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })).status,
    ).toBeGreaterThanOrEqual(400);
  });

  it("initiates and verifies takeaway payments", async () => {
    let response = await handle("/api/customer/orders/o1/payment/initiate", {
      method: "POST",
      headers: sessionHeaders,
    });
    expect(response.status).toBe(201);
    expect(controller.initiateTakeawayPayment).toHaveBeenCalledWith("s1", "o1");

    response = await handle("/api/customer/orders/o1/payment/verify", {
      method: "POST",
      headers: { ...sessionHeaders, "content-type": "application/json" },
      body: JSON.stringify({
        razorpayOrderId: "ro",
        razorpayPaymentId: "rp",
        razorpaySignature: "sig",
      }),
    });
    expect(response.status).toBe(201);
    expect(controller.verifyTakeawayPayment).toHaveBeenCalledWith("s1", "o1", {
      razorpayOrderId: "ro",
      razorpayPaymentId: "rp",
      razorpaySignature: "sig",
    });
  });

  it("checks out and retrieves customer orders", async () => {
    let response = await handle("/api/customer/orders/o1/checkout", {
      method: "POST",
      headers: { ...sessionHeaders, "content-type": "application/json" },
      body: JSON.stringify({ method: "CASH", billId: "b1" }),
    });
    expect(response.status).toBe(201);
    expect(controller.checkout).toHaveBeenCalledWith("s1", {
      orderId: "o1",
      method: "CASH",
      billId: "b1",
    });

    response = await handle("/api/customer/orders/o1", { headers: sessionHeaders });
    expect(response.status).toBe(200);
    expect(controller.getOrder).toHaveBeenCalledWith("s1", "o1");
  });

  it.each([
    ["/api/customer/orders/o1/payment/initiate", { method: "POST" }],
    [
      "/api/customer/orders/o1/payment/verify",
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
      "/api/customer/orders/o1/checkout",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method: "CASH" }),
      },
    ],
    ["/api/customer/orders/o1", undefined],
  ])("rejects missing session token on %s", async (path, init) => {
    expect((await handle(path, init as RequestInit | undefined)).status).toBeGreaterThanOrEqual(400);
  });
});
