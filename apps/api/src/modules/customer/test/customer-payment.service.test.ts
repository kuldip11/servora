import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findOrder: vi.fn(),
  orderRepositoryFindById: vi.fn(),
  publish: vi.fn(),
  deduct: vi.fn(),
  transaction: vi.fn(),
  txExecute: vi.fn(),
  txFindOrder: vi.fn(),
  txFindPayment: vi.fn(),
  txFindBill: vi.fn(),
  txFindBills: vi.fn(),
  txInsert: vi.fn(),
  txInsertValues: vi.fn(),
  txInsertReturning: vi.fn(),
  txUpdate: vi.fn(),
  txUpdateSet: vi.fn(),
  txUpdateWhere: vi.fn(),
}));

vi.mock("@/modules/customer/customer-session.service", () => ({
  customerSessionService: { getSession: mocks.getSession },
}));
vi.mock("@/modules/orders/order.repository", () => ({
  orderRepository: { findById: mocks.orderRepositoryFindById },
}));
vi.mock("@/lib/event-bus", () => ({ eventBus: { publish: mocks.publish } }));
vi.mock("@/modules/inventory/inventory.service", () => ({
  inventoryService: { deductForOrderItems: mocks.deduct },
}));
vi.mock("@/db", () => ({
  db: {
    query: { orders: { findFirst: mocks.findOrder } },
    transaction: mocks.transaction,
  },
}));

import { customerPaymentService } from "@/modules/customer/customer-payment.service";

const session = {
  id: "s1",
  tenantId: "t1",
  branchId: "b1",
  mode: "TAKEAWAY",
};

const baseOrder = {
  id: "o1",
  tenantId: "t1",
  branchId: "b1",
  customerSessionId: "s1",
  type: "TAKEAWAY",
  status: "BILL_REQUESTED",
  subtotal: "100.00",
  taxAmount: "5.00",
  discountAmount: "0.00",
  serviceChargeAmount: "0.00",
  roundingAdjustment: "0.00",
  totalAmount: "105.00",
  payments: [],
  kitchenTickets: [],
  items: [],
};

const buildTx = () => ({
  execute: mocks.txExecute,
  query: {
    orders: { findFirst: mocks.txFindOrder },
    payments: { findFirst: mocks.txFindPayment },
    bills: { findFirst: mocks.txFindBill, findMany: mocks.txFindBills },
  },
  insert: mocks.txInsert,
  update: mocks.txUpdate,
});

const validSignature = (gatewayOrderId = "go1", paymentId = "gp1") =>
  createHmac("sha256", process.env["RAZORPAY_KEY_SECRET"]!)
    .update(`${gatewayOrderId}|${paymentId}`)
    .digest("hex");

describe("customerPaymentService coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env["RAZORPAY_KEY_ID"] = "key";
    process.env["RAZORPAY_KEY_SECRET"] = "secret";
    mocks.getSession.mockResolvedValue(session);
    mocks.findOrder.mockResolvedValue(baseOrder);
    mocks.orderRepositoryFindById.mockResolvedValue({
      ...baseOrder,
      status: "OPEN",
      kitchenTickets: [],
    });
    mocks.publish.mockResolvedValue(undefined);
    mocks.deduct.mockResolvedValue(undefined);
    mocks.txExecute.mockResolvedValue(undefined);
    mocks.txFindOrder.mockResolvedValue(baseOrder);
    mocks.txFindPayment.mockResolvedValue({ id: "p1", status: "PENDING" });
    mocks.txFindBill.mockResolvedValue({ id: "bill1", totalAmount: "105.00" });
    mocks.txFindBills.mockResolvedValue([]);
    mocks.txInsert.mockReturnValue({ values: mocks.txInsertValues });
    mocks.txInsertValues.mockReturnValue({ returning: mocks.txInsertReturning });
    mocks.txInsertReturning.mockResolvedValue([
      { id: "p1", billId: "bill1", method: "RAZORPAY", status: "PENDING" },
    ]);
    mocks.txUpdate.mockReturnValue({ set: mocks.txUpdateSet });
    mocks.txUpdateSet.mockReturnValue({ where: mocks.txUpdateWhere });
    mocks.txUpdateWhere.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(async (cb) => cb(buildTx()));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "go1",
          order_id: "go1",
          status: "captured",
          amount: 10500,
          currency: "INR",
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env["RAZORPAY_KEY_ID"];
    delete process.env["RAZORPAY_KEY_SECRET"];
  });

  it("validates takeaway payment initialization and reuses pending gateway payments", async () => {
    mocks.txFindOrder.mockResolvedValueOnce(null);
    await expect(
      customerPaymentService.initiateTakeawayPayment("t1", "b1", "missing"),
    ).rejects.toThrow("Takeaway order was not found");

    mocks.txFindOrder.mockResolvedValueOnce({ ...baseOrder, status: "PAID" });
    await expect(
      customerPaymentService.initiateTakeawayPayment("t1", "b1", "o1"),
    ).rejects.toThrow("This order can no longer accept payment");

    const pending = {
      id: "p-existing",
      method: "RAZORPAY",
      status: "PENDING",
      gatewayOrderId: "go-existing",
    };
    mocks.txFindOrder.mockResolvedValueOnce({ ...baseOrder, payments: [pending] });
    await expect(
      customerPaymentService.initiateTakeawayPayment("t1", "b1", "o1"),
    ).resolves.toBe(pending);
  });

  it("creates a bill and Razorpay payment, including configuration and gateway failures", async () => {
    mocks.txFindBill.mockResolvedValue(null);
    mocks.txInsertReturning
      .mockResolvedValueOnce([{ id: "bill-new", totalAmount: "105.00" }])
      .mockResolvedValueOnce([{ id: "p-new", gatewayOrderId: "go1" }]);

    const payment = await customerPaymentService.initiateTakeawayPayment(
      "t1",
      "b1",
      "o1",
    );
    expect(payment).toEqual({ id: "p-new", gatewayOrderId: "go1" });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.razorpay.com/v1/orders",
      expect.objectContaining({ method: "POST" }),
    );

    delete process.env["RAZORPAY_KEY_SECRET"];
    await expect(
      customerPaymentService.initiateTakeawayPayment("t1", "b1", "o1"),
    ).rejects.toThrow("Online takeaway payments are not configured");

    process.env["RAZORPAY_KEY_SECRET"] = "secret";
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    await expect(
      customerPaymentService.initiateTakeawayPayment("t1", "b1", "o1"),
    ).rejects.toThrow("Unable to initialize online payment");
  });

  it("rejects initialization when no bill can be returned", async () => {
    mocks.txFindBill.mockResolvedValue(null);
    mocks.txInsertReturning.mockResolvedValueOnce([]);
    await expect(
      customerPaymentService.initiateTakeawayPayment("t1", "b1", "o1"),
    ).rejects.toThrow("Unable to initialize order bill");
  });

  it("validates takeaway verification ownership, state and signature", async () => {
    mocks.getSession.mockResolvedValueOnce({ ...session, mode: "DINE_IN" });
    await expect(
      customerPaymentService.verifyTakeawayPayment("tok", {
        orderId: "o1",
        razorpayOrderId: "go1",
        razorpayPaymentId: "gp1",
        razorpaySignature: "x",
      }),
    ).rejects.toThrow("Online payment is only required for takeaway orders");

    mocks.findOrder.mockResolvedValueOnce(null);
    await expect(
      customerPaymentService.verifyTakeawayPayment("tok", {
        orderId: "o1",
        razorpayOrderId: "go1",
        razorpayPaymentId: "gp1",
        razorpaySignature: "x",
      }),
    ).rejects.toThrow("Order does not belong to this customer session");

    mocks.findOrder.mockResolvedValueOnce({ ...baseOrder, payments: [] });
    await expect(
      customerPaymentService.verifyTakeawayPayment("tok", {
        orderId: "o1",
        razorpayOrderId: "go1",
        razorpayPaymentId: "gp1",
        razorpaySignature: "x",
      }),
    ).rejects.toThrow("Payment attempt was not found");

    mocks.findOrder.mockResolvedValueOnce({
      ...baseOrder,
      payments: [{ id: "p1", gatewayOrderId: "go1", status: "FAILED" }],
    });
    await expect(
      customerPaymentService.verifyTakeawayPayment("tok", {
        orderId: "o1",
        razorpayOrderId: "go1",
        razorpayPaymentId: "gp1",
        razorpaySignature: "x",
      }),
    ).rejects.toThrow("Payment attempt is no longer payable");

    mocks.findOrder.mockResolvedValueOnce({
      ...baseOrder,
      payments: [{ id: "p1", gatewayOrderId: "go1", status: "PENDING" }],
    });
    await expect(
      customerPaymentService.verifyTakeawayPayment("tok", {
        orderId: "o1",
        razorpayOrderId: "go1",
        razorpayPaymentId: "gp1",
        razorpaySignature: "wrong",
      }),
    ).rejects.toThrow("Payment verification failed");
  });

  it("returns the order for an already successful payment using reference/metadata lookup paths", async () => {
    mocks.findOrder.mockResolvedValueOnce({
      ...baseOrder,
      payments: [{ id: "p1", reference: "go1", status: "SUCCESS" }],
    });
    await expect(
      customerPaymentService.verifyTakeawayPayment("tok", {
        orderId: "o1",
        razorpayOrderId: "go1",
        razorpayPaymentId: "gp1",
        razorpaySignature: "ignored",
      }),
    ).resolves.toEqual(expect.objectContaining({ id: "o1" }));

    mocks.findOrder.mockResolvedValueOnce({
      ...baseOrder,
      payments: [
        {
          id: "p2",
          metadata: JSON.stringify({ gatewayOrderId: "go1" }),
          status: "SUCCESS",
        },
      ],
    });
    await customerPaymentService.verifyTakeawayPayment("tok", {
      orderId: "o1",
      razorpayOrderId: "go1",
      razorpayPaymentId: "gp1",
      razorpaySignature: "ignored",
    });
    expect(mocks.orderRepositoryFindById).toHaveBeenCalledTimes(2);
  });

  it("rejects Razorpay lookup failures and mismatched captured payment details", async () => {
    const payment = {
      id: "p1",
      gatewayOrderId: "go1",
      status: "PENDING",
      amount: "105.00",
    };
    mocks.findOrder.mockResolvedValue({ ...baseOrder, payments: [payment] });
    const signature = validSignature();

    delete process.env["RAZORPAY_KEY_ID"];
    await expect(
      customerPaymentService.verifyTakeawayPayment("tok", {
        orderId: "o1",
        razorpayOrderId: "go1",
        razorpayPaymentId: "gp1",
        razorpaySignature: signature,
      }),
    ).rejects.toThrow("Online takeaway payments are not configured");

    process.env["RAZORPAY_KEY_ID"] = "key";
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    await expect(
      customerPaymentService.verifyTakeawayPayment("tok", {
        orderId: "o1",
        razorpayOrderId: "go1",
        razorpayPaymentId: "gp1",
        razorpaySignature: signature,
      }),
    ).rejects.toThrow("Unable to verify payment with Razorpay");

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        order_id: "wrong",
        status: "captured",
        currency: "INR",
        amount: 10500,
      }),
    } as Response);
    await expect(
      customerPaymentService.verifyTakeawayPayment("tok", {
        orderId: "o1",
        razorpayOrderId: "go1",
        razorpayPaymentId: "gp1",
        razorpaySignature: signature,
      }),
    ).rejects.toThrow("Razorpay payment is not captured for this order");
  });

  it("releases a verified payment, deducts ticket inventory, and publishes order/tickets", async () => {
    const payment = {
      id: "p1",
      gatewayOrderId: "go1",
      status: "PENDING",
      amount: "105.00",
    };
    mocks.findOrder.mockResolvedValue({
      ...baseOrder,
      payments: [payment],
      kitchenTickets: [
        { id: "kt1", status: "PENDING_PAYMENT" },
        { id: "kt2", status: "PENDING_PAYMENT" },
      ],
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
          id: "oi2",
          kitchenTicketId: "kt2",
          menuItemId: null,
          variantId: null,
          quantity: 1,
          modifiers: [],
        },
      ],
    });
    mocks.txFindPayment.mockResolvedValue({ id: "p1", status: "PENDING" });
    mocks.orderRepositoryFindById.mockResolvedValue({
      ...baseOrder,
      kitchenTickets: [
        { id: "kt1", status: "FIRED" },
        { id: "kt2", status: "FIRED" },
      ],
    });

    const result = await customerPaymentService.verifyTakeawayPayment("tok", {
      orderId: "o1",
      razorpayOrderId: "go1",
      razorpayPaymentId: "gp1",
      razorpaySignature: validSignature(),
    });

    expect(result).toEqual(expect.objectContaining({ id: "o1" }));
    expect(mocks.deduct).toHaveBeenCalledTimes(2);
    expect(mocks.deduct).toHaveBeenNthCalledWith(
      1,
      "t1",
      "b1",
      "o1",
      "kt1",
      [
        expect.objectContaining({
          orderItemId: "oi1",
          menuItemId: "mi1",
          quantity: 2,
          selectedOptions: [{ optionId: "mod1", quantity: 1 }],
        }),
      ],
      null,
    );
    expect(mocks.publish).toHaveBeenCalledTimes(3);
  });

  it("handles concurrent success and inventory deduction failure after verification", async () => {
    const payment = {
      id: "p1",
      gatewayOrderId: "go1",
      status: "PENDING",
      amount: "105.00",
    };
    mocks.findOrder.mockResolvedValue({
      ...baseOrder,
      payments: [payment],
      kitchenTickets: [{ id: "kt1", status: "PENDING_PAYMENT" }],
      items: [],
    });
    mocks.txFindPayment.mockResolvedValueOnce({ id: "p1", status: "SUCCESS" });
    await customerPaymentService.verifyTakeawayPayment("tok", {
      orderId: "o1",
      razorpayOrderId: "go1",
      razorpayPaymentId: "gp1",
      razorpaySignature: validSignature(),
    });
    expect(mocks.publish).not.toHaveBeenCalled();

    mocks.txFindPayment.mockResolvedValueOnce({ id: "p1", status: "PENDING" });
    mocks.deduct.mockRejectedValueOnce(new Error("inventory down"));
    mocks.orderRepositoryFindById.mockResolvedValueOnce({
      ...baseOrder,
      kitchenTickets: [{ id: "kt1", status: "FIRED" }],
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await customerPaymentService.verifyTakeawayPayment("tok", {
      orderId: "o1",
      razorpayOrderId: "go1",
      razorpayPaymentId: "gp1",
      razorpaySignature: validSignature(),
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      "Inventory deduction failed after takeaway payment",
      "o1",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("rejects a payment that disappears inside the verification transaction", async () => {
    mocks.findOrder.mockResolvedValue({
      ...baseOrder,
      payments: [
        { id: "p1", gatewayOrderId: "go1", status: "PENDING", amount: "105.00" },
      ],
    });
    mocks.txFindPayment.mockResolvedValue(null);
    await expect(
      customerPaymentService.verifyTakeawayPayment("tok", {
        orderId: "o1",
        razorpayOrderId: "go1",
        razorpayPaymentId: "gp1",
        razorpaySignature: validSignature(),
      }),
    ).rejects.toThrow("Payment attempt was not found");
  });

  it("validates checkout order lifecycle and transaction races", async () => {
    mocks.findOrder.mockResolvedValueOnce(null);
    await expect(
      customerPaymentService.checkout("tok", { orderId: "o1", method: "CASH" }),
    ).rejects.toThrow("Order does not belong to this customer session");

    mocks.findOrder.mockResolvedValueOnce({ ...baseOrder, status: "CLOSED" });
    await expect(
      customerPaymentService.checkout("tok", { orderId: "o1", method: "CASH" }),
    ).rejects.toThrow("This order can no longer be checked out");

    mocks.findOrder.mockResolvedValueOnce({ ...baseOrder, status: "OPEN" });
    await expect(
      customerPaymentService.checkout("tok", { orderId: "o1", method: "CASH" }),
    ).rejects.toThrow("Request the bill before making a payment");

    mocks.txFindOrder.mockResolvedValueOnce(null);
    await expect(
      customerPaymentService.checkout("tok", { orderId: "o1", method: "CASH" }),
    ).rejects.toThrow("Order no longer exists");
  });

  it("requires a bill selection when split bills exist", async () => {
    mocks.txFindBills.mockResolvedValue([
      { id: "b1", totalAmount: "50.00" },
      { id: "b2", totalAmount: "55.00" },
    ]);
    await expect(
      customerPaymentService.checkout("tok", { orderId: "o1", method: "CASH" }),
    ).rejects.toThrow("Select the bill to check out");
  });

  it("returns existing pending/successful checkout payments", async () => {
    mocks.txFindBills.mockResolvedValue([{ id: "b1", totalAmount: "105.00" }]);
    mocks.txFindOrder.mockResolvedValueOnce({
      ...baseOrder,
      payments: [{ id: "p1", billId: "b1", method: "CASH", status: "PENDING" }],
    });
    await expect(
      customerPaymentService.checkout("tok", { orderId: "o1", method: "CASH" }),
    ).resolves.toMatchObject({ paymentRequired: true, method: "CASH" });

    mocks.txFindOrder.mockResolvedValueOnce({
      ...baseOrder,
      payments: [{ id: "p2", billId: "b1", method: "CASH", status: "SUCCESS" }],
    });
    await expect(
      customerPaymentService.checkout("tok", {
        orderId: "o1",
        billId: "b1",
        method: "CASH",
      }),
    ).resolves.toMatchObject({ paymentRequired: false, method: "CASH" });
  });

  it("creates missing checkout bill and payment and supports explicit bill selection", async () => {
    mocks.txFindBills.mockResolvedValue([]);
    mocks.txInsertReturning
      .mockResolvedValueOnce([{ id: "bill-new", totalAmount: "105.00" }])
      .mockResolvedValueOnce([
        { id: "p-new", billId: "bill-new", method: "CASH", status: "PENDING" },
      ]);
    await expect(
      customerPaymentService.checkout("tok", { orderId: "o1", method: "CASH" }),
    ).resolves.toMatchObject({ paymentRequired: true, method: "CASH" });

    mocks.txFindBills.mockResolvedValueOnce([
      { id: "b1", totalAmount: "50.00" },
      { id: "b2", totalAmount: "55.00" },
    ]);
    mocks.txFindOrder.mockResolvedValueOnce({ ...baseOrder, payments: [] });
    mocks.txInsertReturning.mockResolvedValueOnce([
      { id: "p-explicit", billId: "b2", method: "CASH", status: "PENDING" },
    ]);
    const result = await customerPaymentService.checkout("tok", {
      orderId: "o1",
      billId: "b2",
      method: "CASH",
    });
    expect(result.payment).toEqual(expect.objectContaining({ billId: "b2" }));
  });

  it("gets only an order belonging to the customer session", async () => {
    mocks.findOrder.mockResolvedValueOnce(null);
    await expect(customerPaymentService.getOrder("tok", "missing")).rejects.toThrow(
      "Order does not belong to this customer session",
    );

    const order = { ...baseOrder, id: "o2" };
    mocks.findOrder.mockResolvedValueOnce(order);
    await expect(customerPaymentService.getOrder("tok", "o2")).resolves.toBe(order);
  });
  it("rejects verification when the signing secret disappears before signature validation", async () => {
    mocks.findOrder.mockResolvedValue({
      ...baseOrder,
      payments: [
        {
          id: "p1",
          gatewayOrderId: "go1",
          status: "PENDING",
          amount: "105.00",
        },
      ],
    });
    delete process.env["RAZORPAY_KEY_SECRET"];

    await expect(
      customerPaymentService.verifyTakeawayPayment("tok", {
        orderId: "o1",
        razorpayOrderId: "go1",
        razorpayPaymentId: "gp1",
        razorpaySignature: "anything",
      }),
    ).rejects.toThrow("Payment verification failed");
  });

  it("handles a missing refreshed order after successful verification", async () => {
    mocks.findOrder.mockResolvedValue({
      ...baseOrder,
      payments: [
        {
          id: "p1",
          gatewayOrderId: "go1",
          status: "PENDING",
          amount: "105.00",
        },
      ],
    });
    mocks.txFindPayment.mockResolvedValue({ id: "p1", status: "PENDING" });
    mocks.orderRepositoryFindById.mockResolvedValueOnce(null);

    await expect(
      customerPaymentService.verifyTakeawayPayment("tok", {
        orderId: "o1",
        razorpayOrderId: "go1",
        razorpayPaymentId: "gp1",
        razorpaySignature: validSignature(),
      }),
    ).resolves.toBeNull();

    expect(mocks.deduct).not.toHaveBeenCalled();
    expect(mocks.publish).toHaveBeenCalledTimes(1);
    expect(mocks.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: "order.updated", payload: null }),
      "t1",
      "b1",
    );
  });

});
