import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  eventFindFirst: vi.fn(),
  paymentFindFirst: vi.fn(),
  txEventFindFirst: vi.fn(),
  txPaymentFindFirst: vi.fn(),
  txTicketFindMany: vi.fn(),
  txExecute: vi.fn(),
  txUpdate: vi.fn(),
  txUpdateSet: vi.fn(),
  txUpdateWhere: vi.fn(),
  txInsert: vi.fn(),
  txInsertValues: vi.fn(),
  dbUpdate: vi.fn(),
  dbUpdateSet: vi.fn(),
  dbUpdateWhere: vi.fn(),
  lpush: vi.fn(),
  findOrder: vi.fn(),
  deduct: vi.fn(),
  publish: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    transaction: mocks.transaction,
    query: {
      paymentWebhookEvents: { findFirst: mocks.eventFindFirst },
      payments: { findFirst: mocks.paymentFindFirst },
    },
    update: mocks.dbUpdate,
  },
}));
vi.mock("@/lib/redis", () => ({
  redis: { lpush: mocks.lpush },
  REDIS_QUEUES: { RAZORPAY_WEBHOOKS: "razorpay-webhooks" },
}));
vi.mock("@/modules/orders/order.repository", () => ({
  orderRepository: { findById: mocks.findOrder },
}));
vi.mock("@/modules/inventory/inventory.service", () => ({
  inventoryService: { deductForOrderItems: mocks.deduct },
}));
vi.mock("@/lib/event-bus", () => ({ eventBus: { publish: mocks.publish } }));

import { razorpayWebhookService } from "@/modules/billing/razorpay-webhook.service";

const raw = (event = "payment.captured") =>
  JSON.stringify({
    event,
    payload: {
      payment: {
        entity: {
          id: "gp1",
          order_id: "go1",
          status: event === "payment.failed" ? "failed" : "captured",
          amount: 10500,
          currency: "INR",
        },
      },
      order: { entity: { id: "go1", status: "paid" } },
    },
  });

const signature = (body: string) =>
  createHmac("sha256", process.env["RAZORPAY_WEBHOOK_SECRET"]!)
    .update(body)
    .digest("hex");

const buildTx = () => ({
  query: {
    paymentWebhookEvents: { findFirst: mocks.txEventFindFirst },
    payments: { findFirst: mocks.txPaymentFindFirst },
    kitchenTickets: { findMany: mocks.txTicketFindMany },
  },
  execute: mocks.txExecute,
  update: mocks.txUpdate,
  insert: mocks.txInsert,
});

describe("razorpayWebhookService coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env["RAZORPAY_WEBHOOK_SECRET"] = "secret";
    mocks.transaction.mockImplementation(async (cb) => cb(buildTx()));
    mocks.txUpdate.mockReturnValue({ set: mocks.txUpdateSet });
    mocks.txUpdateSet.mockReturnValue({ where: mocks.txUpdateWhere });
    mocks.txUpdateWhere.mockResolvedValue(undefined);
    mocks.txInsert.mockReturnValue({ values: mocks.txInsertValues });
    mocks.txInsertValues.mockResolvedValue(undefined);
    mocks.dbUpdate.mockReturnValue({ set: mocks.dbUpdateSet });
    mocks.dbUpdateSet.mockReturnValue({ where: mocks.dbUpdateWhere });
    mocks.dbUpdateWhere.mockResolvedValue(undefined);
    mocks.lpush.mockResolvedValue(1);
    mocks.eventFindFirst.mockResolvedValue(null);
    mocks.paymentFindFirst.mockResolvedValue(null);
    mocks.txEventFindFirst.mockResolvedValue(null);
    mocks.txPaymentFindFirst.mockResolvedValue(null);
    mocks.txTicketFindMany.mockResolvedValue([]);
    mocks.txExecute.mockResolvedValue(undefined);
    mocks.findOrder.mockResolvedValue(null);
    mocks.deduct.mockResolvedValue({ short: [] });
    mocks.publish.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env["RAZORPAY_WEBHOOK_SECRET"];
  });

  it("requires webhook headers, configured secret, valid signature, and valid JSON", async () => {
    await expect(razorpayWebhookService.handle("{}", undefined, "e1")).rejects.toThrow(
      "signature and event id are required",
    );
    await expect(razorpayWebhookService.handle("{}", "sig", undefined)).rejects.toThrow(
      "signature and event id are required",
    );

    delete process.env["RAZORPAY_WEBHOOK_SECRET"];
    await expect(razorpayWebhookService.handle("{}", "sig", "e1")).rejects.toThrow(
      "webhook secret is not configured",
    );

    process.env["RAZORPAY_WEBHOOK_SECRET"] = "secret";
    await expect(razorpayWebhookService.handle("{}", "bad", "e1")).rejects.toThrow(
      "Invalid Razorpay webhook signature",
    );

    const invalid = "not-json";
    await expect(
      razorpayWebhookService.handle(invalid, signature(invalid), "e1"),
    ).rejects.toThrow("Invalid Razorpay webhook payload");
  });

  it("inserts and queues a new webhook event", async () => {
    const body = raw();
    await expect(
      razorpayWebhookService.handle(body, signature(body), "e1"),
    ).resolves.toEqual({ duplicate: false, queued: true });
    expect(mocks.txInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "e1", eventType: "payment.captured", status: "RECEIVED" }),
    );
    expect(mocks.lpush).toHaveBeenCalledWith("razorpay-webhooks", "e1");
  });

  it("returns processed duplicates without queueing and requeues failed/received duplicates", async () => {
    const body = JSON.stringify({});
    mocks.txEventFindFirst.mockResolvedValueOnce({ status: "PROCESSED" });
    await expect(
      razorpayWebhookService.handle(body, signature(body), "e1"),
    ).resolves.toEqual({ duplicate: true, queued: false });
    expect(mocks.lpush).not.toHaveBeenCalled();

    mocks.txEventFindFirst.mockResolvedValueOnce({ status: "FAILED" });
    await expect(
      razorpayWebhookService.handle(body, signature(body), "e2"),
    ).resolves.toEqual({ duplicate: true, queued: true });
    expect(mocks.txUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "unknown", status: "RECEIVED", error: null }),
    );
  });

  it("handles missing and already processed events", async () => {
    mocks.eventFindFirst.mockResolvedValueOnce(null);
    await expect(razorpayWebhookService.processEvent("missing")).resolves.toEqual({
      processed: false,
      reason: "not_found",
    });

    mocks.eventFindFirst.mockResolvedValueOnce({ status: "PROCESSED" });
    await expect(razorpayWebhookService.processEvent("done")).resolves.toEqual({
      processed: true,
      duplicate: true,
    });
  });

  it("processes captured payments, holds later courses, releases first-course tickets, inventory and events", async () => {
    mocks.eventFindFirst.mockResolvedValue({
      eventId: "e1",
      eventType: "payment.captured",
      status: "RECEIVED",
      payload: raw(),
    });
    mocks.paymentFindFirst.mockResolvedValue({
      id: "p1",
      orderId: "o1",
      status: "PENDING",
      amount: "105.00",
      order: { tenantId: "t1", branchId: "b1" },
    });
    mocks.txPaymentFindFirst.mockResolvedValue({ id: "p1", orderId: "o1", status: "PENDING" });
    mocks.txTicketFindMany.mockResolvedValue([
      { id: "kt1", course: null },
      { id: "kt2", course: { courseNumber: 2 } },
    ]);
    mocks.findOrder
      .mockResolvedValueOnce({
        id: "o1",
        items: [
          {
            id: "oi1",
            kitchenTicketId: "kt1",
            menuItemId: "mi1",
            variantId: null,
            quantity: 2,
            modifiers: [
              { modifierId: "mod1", quantity: 1 },
              { modifierId: null, quantity: 1 },
            ],
          },
          {
            id: "synthetic",
            kitchenTicketId: "kt1",
            menuItemId: null,
            variantId: null,
            quantity: 1,
            modifiers: [],
          },
        ],
        kitchenTickets: [],
      })
      .mockResolvedValueOnce({
        id: "o1",
        kitchenTickets: [
          { id: "kt1", status: "FIRED" },
          { id: "kt2", status: "HELD" },
        ],
      });

    await expect(razorpayWebhookService.processEvent("e1")).resolves.toEqual({
      processed: true,
      duplicate: false,
    });
    expect(mocks.deduct).toHaveBeenCalledWith(
      "t1",
      "b1",
      "o1",
      "kt1",
      [
        expect.objectContaining({
          orderItemId: "oi1",
          selectedOptions: [{ optionId: "mod1", quantity: 1 }],
        }),
      ],
      null,
    );
    expect(mocks.publish).toHaveBeenCalledTimes(2);
    expect(mocks.dbUpdateSet).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "PROCESSED", error: null }),
    );
  });

  it("logs inventory shortages and safely handles current payment already successful", async () => {
    mocks.eventFindFirst.mockResolvedValue({ status: "RECEIVED", eventType: "payment.captured", payload: raw() });
    mocks.paymentFindFirst.mockResolvedValue({
      id: "p1",
      orderId: "o1",
      status: "PENDING",
      amount: "105.00",
      order: { tenantId: "t1", branchId: "b1" },
    });
    mocks.txPaymentFindFirst.mockResolvedValueOnce({ id: "p1", status: "SUCCESS" });
    await razorpayWebhookService.processEvent("e1");
    expect(mocks.findOrder).not.toHaveBeenCalled();

    mocks.txPaymentFindFirst.mockResolvedValueOnce({ id: "p1", orderId: "o1", status: "PENDING" });
    mocks.txTicketFindMany.mockResolvedValueOnce([{ id: "kt1", course: null }]);
    mocks.findOrder.mockResolvedValueOnce({
      items: [{ id: "oi1", kitchenTicketId: "kt1", menuItemId: "mi1", variantId: null, quantity: 1, modifiers: [] }],
    }).mockResolvedValueOnce(null);
    mocks.deduct.mockResolvedValueOnce({ short: [{ item: "x" }] });
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await razorpayWebhookService.processEvent("e2");
    expect(spy).toHaveBeenCalledWith(
      "Inventory was short when releasing paid takeaway order",
      "o1",
      [{ item: "x" }],
    );
    spy.mockRestore();
  });

  it("marks failed gateway payments and processes non-payment events", async () => {
    mocks.eventFindFirst.mockResolvedValueOnce({
      status: "RECEIVED",
      eventType: "payment.failed",
      payload: raw("payment.failed"),
    });
    await razorpayWebhookService.processEvent("failed");
    expect(mocks.dbUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "FAILED",
        reference: "gp1",
        gatewayPaymentId: "gp1",
        gatewayOrderId: "go1",
      }),
    );

    mocks.eventFindFirst.mockResolvedValueOnce({
      status: "RECEIVED",
      eventType: "other",
      payload: JSON.stringify({ event: "other" }),
    });
    await expect(razorpayWebhookService.processEvent("other")).resolves.toEqual({
      processed: true,
      duplicate: false,
    });
  });

  it("records processing failures with retry metadata and rethrows", async () => {
    mocks.eventFindFirst.mockResolvedValue({
      status: "RECEIVED",
      eventType: "payment.captured",
      payload: "invalid-json",
    });
    await expect(razorpayWebhookService.processEvent("e1")).rejects.toThrow();
    expect(mocks.dbUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "FAILED",
        nextAttemptAt: expect.any(Date),
        error: expect.any(String),
      }),
    );
  });
  it("falls back to stored event type and order entity id when payment order id is absent", async () => {
    mocks.eventFindFirst
      .mockResolvedValueOnce({
        status: "RECEIVED",
        eventType: "other",
        payload: JSON.stringify({}),
      })
      .mockResolvedValueOnce({
        status: "RECEIVED",
        eventType: "payment.captured",
        payload: JSON.stringify({
          payload: {
            payment: { entity: { id: "gp1" } },
            order: { entity: { id: "go1" } },
          },
        }),
      });

    await expect(razorpayWebhookService.processEvent("stored-type")).resolves.toEqual({
      processed: true,
      duplicate: false,
    });
    await expect(razorpayWebhookService.processEvent("order-fallback")).resolves.toEqual({
      processed: true,
      duplicate: false,
    });
    expect(mocks.paymentFindFirst).toHaveBeenCalledOnce();
  });

  it("records non-Error processing failures as strings", async () => {
    mocks.eventFindFirst.mockResolvedValue({
      status: "RECEIVED",
      eventType: "payment.captured",
      payload: raw(),
    });
    mocks.paymentFindFirst.mockRejectedValueOnce("db-string-failure");

    await expect(razorpayWebhookService.processEvent("string-failure")).rejects.toBe(
      "db-string-failure",
    );
    expect(mocks.dbUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "FAILED",
        error: "db-string-failure",
      }),
    );
  });

});
