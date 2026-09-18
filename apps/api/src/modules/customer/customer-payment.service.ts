import { createLogger, toError } from "@/core/logger/logger";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { KitchenTicket, Order } from "@pos/types";
import { db } from "@/db";
import { bills, kitchenTickets, orders, payments } from "@/db/schema";
import { ValidationError } from "@/core/errors";
import { eventBus } from "@/lib/event-bus";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { orderRepository } from "@/modules/orders/order.repository";
import { customerSessionService } from "./customer-session.service";

const logger = createLogger({}, "customer-payment");

export type CustomerCheckoutInput = {
  orderId: string;
  billId?: string;
  method: "CASH";
};

const razorpayConfig = () => ({
  keyId: process.env["RAZORPAY_KEY_ID"],
  keySecret: process.env["RAZORPAY_KEY_SECRET"],
});

const createRazorpayOrder = async (amount: string, receipt: string) => {
  const { keyId, keySecret } = razorpayConfig();
  if (!keyId || !keySecret) {
    throw new ValidationError(
      "Online takeaway payments are not configured for this restaurant",
    );
  }
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(Number(amount) * 100),
      currency: "INR",
      receipt,
    }),
  });
  if (!response.ok)
    throw new ValidationError("Unable to initialize online payment");
  return (await response.json()) as {
    id: string;
    amount: number;
    currency: string;
  };
};

const verifyRazorpaySignature = (
  orderId: string,
  paymentId: string,
  signature: string,
) => {
  const secret = process.env["RAZORPAY_KEY_SECRET"];
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
};

const fetchRazorpayPayment = async (paymentId: string) => {
  const { keyId, keySecret } = razorpayConfig();
  if (!keyId || !keySecret) {
    throw new ValidationError(
      "Online takeaway payments are not configured for this restaurant",
    );
  }
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
    { headers: { Authorization: `Basic ${auth}` } },
  );
  if (!response.ok) {
    throw new ValidationError("Unable to verify payment with Razorpay");
  }
  return (await response.json()) as {
    id: string;
    order_id: string;
    status: string;
    amount: number;
    currency: string;
  };
};

export const customerPaymentService = {
  async initiateTakeawayPayment(
    tenantId: string,
    branchId: string,
    orderId: string,
  ) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${orderId}))`);
      const order = await tx.query.orders.findFirst({
        where: and(
          eq(orders.id, orderId),
          eq(orders.tenantId, tenantId),
          eq(orders.branchId, branchId),
          eq(orders.type, "TAKEAWAY"),
        ),
        with: { payments: true },
      });
      if (!order) throw new ValidationError("Takeaway order was not found");
      if (["PAID", "CLOSED", "CANCELLED"].includes(order.status)) {
        throw new ValidationError("This order can no longer accept payment");
      }
      const pending = order.payments.find(
        (payment) =>
          payment.method === "RAZORPAY" &&
          payment.status === "PENDING" &&
          payment.gatewayOrderId,
      );
      if (pending) return pending;

      const bill =
        (await tx.query.bills.findFirst({
          where: eq(bills.orderId, orderId),
        })) ??
        (
          await tx
            .insert(bills)
            .values({
              orderId,
              subtotal: order.subtotal,
              taxAmount: order.taxAmount,
              discountAmount: order.discountAmount,
              serviceChargeAmount: order.serviceChargeAmount,
              roundingAdjustment: order.roundingAdjustment,
              totalAmount: order.totalAmount,
            })
            .returning()
        )[0];
      if (!bill) throw new ValidationError("Unable to initialize order bill");

      const gatewayOrder = await createRazorpayOrder(
        order.totalAmount,
        orderId,
      );
      const [payment] = await tx
        .insert(payments)
        .values({
          orderId,
          billId: bill.id,
          method: "RAZORPAY",
          amount: order.totalAmount,
          status: "PENDING",
          reference: gatewayOrder.id,
          gatewayOrderId: gatewayOrder.id,
          metadata: JSON.stringify({
            gateway: "RAZORPAY",
            gatewayOrderId: gatewayOrder.id,
          }),
        })
        .returning();
      return payment!;
    });
  },

  async verifyTakeawayPayment(
    token: string,
    input: {
      orderId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) {
    const session = await customerSessionService.getSession(token);
    if (session.mode !== "TAKEAWAY") {
      throw new ValidationError(
        "Online payment is only required for takeaway orders",
      );
    }
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, input.orderId),
        eq(orders.tenantId, session.tenantId),
        eq(orders.branchId, session.branchId),
        eq(orders.customerSessionId, session.id),
      ),
      with: {
        payments: true,
        kitchenTickets: true,
        items: { with: { modifiers: true } },
      },
    });
    if (!order) {
      throw new ValidationError(
        "Order does not belong to this customer session",
      );
    }
    const payment = order.payments.find(
      (value) =>
        value.gatewayOrderId === input.razorpayOrderId ||
        value.reference === input.razorpayOrderId ||
        value.metadata?.includes(
          `\"gatewayOrderId\":\"${input.razorpayOrderId}\"`,
        ),
    );
    if (!payment) throw new ValidationError("Payment attempt was not found");
    if (payment.status === "SUCCESS") {
      return orderRepository.findById(session.tenantId, order.id);
    }
    if (payment.status !== "PENDING") {
      throw new ValidationError("Payment attempt is no longer payable");
    }
    if (
      !verifyRazorpaySignature(
        input.razorpayOrderId,
        input.razorpayPaymentId,
        input.razorpaySignature,
      )
    ) {
      throw new ValidationError("Payment verification failed");
    }

    const gatewayPayment = await fetchRazorpayPayment(input.razorpayPaymentId);
    if (
      gatewayPayment.order_id !== input.razorpayOrderId ||
      gatewayPayment.status !== "captured" ||
      gatewayPayment.currency !== "INR" ||
      gatewayPayment.amount !== Math.round(Number(payment.amount) * 100)
    ) {
      throw new ValidationError(
        "Razorpay payment is not captured for this order",
      );
    }

    const shouldRelease = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${order.id}))`,
      );
      const current = await tx.query.payments.findFirst({
        where: eq(payments.id, payment.id),
      });
      if (!current) throw new ValidationError("Payment attempt was not found");
      if (current.status === "SUCCESS") return false;
      await tx
        .update(payments)
        .set({
          status: "SUCCESS",
          reference: input.razorpayPaymentId,
          gatewayOrderId: input.razorpayOrderId,
          gatewayPaymentId: input.razorpayPaymentId,
          metadata: JSON.stringify({
            gateway: "RAZORPAY",
            gatewayOrderId: input.razorpayOrderId,
            gatewayPaymentId: input.razorpayPaymentId,
          }),
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));
      await tx
        .update(kitchenTickets)
        .set({ status: "FIRED", updatedAt: new Date() })
        .where(
          and(
            eq(kitchenTickets.orderId, order.id),
            eq(kitchenTickets.status, "PENDING_PAYMENT"),
          ),
        );
      return true;
    });

    if (shouldRelease) {
      try {
        const releasedIds = new Set(
          order.kitchenTickets
            .filter((ticket) => ticket.status === "PENDING_PAYMENT")
            .map((ticket) => ticket.id),
        );
        for (const ticketId of releasedIds) {
          const ticketItems = order.items.filter(
            (item) => item.kitchenTicketId === ticketId,
          );
          await inventoryService.deductForOrderItemsWithRetry(
            session.tenantId,
            session.branchId,
            order.id,
            ticketId,
            ticketItems.flatMap((item) =>
              item.menuItemId === null
                ? []
                : [
                    {
                      orderItemId: item.id,
                      menuItemId: item.menuItemId,
                      variantId: item.variantId,
                      quantity: item.quantity,
                      selectedOptions: item.modifiers.flatMap((modifier) =>
                        modifier.modifierId == null
                          ? []
                          : [
                              {
                                optionId: modifier.modifierId,
                                quantity: modifier.quantity,
                              },
                            ],
                      ),
                    },
                  ],
            ),
            null,
          );
        }
      } catch (err) {
        logger.error("customer_payment.inventory_deduction_failed", toError(err), {
          orderId: order.id,
          branchId: session.branchId,
        });
      }
      const updated = await orderRepository.findById(
        session.tenantId,
        order.id,
      );
      await eventBus.publish(
        { type: "order.updated", payload: updated as unknown as Order },
        session.tenantId,
        session.branchId,
      );
      const releasedTickets = (updated?.kitchenTickets ?? []).filter(
        (ticket) => ticket.status === "FIRED",
      );
      for (const releasedTicket of releasedTickets) {
        await eventBus.publish(
          {
            type: "kitchen.ticket.created",
            payload: releasedTicket as unknown as KitchenTicket,
          },
          session.tenantId,
          session.branchId,
        );
      }
      return updated;
    }
    return orderRepository.findById(session.tenantId, order.id);
  },

  async checkout(token: string, input: CustomerCheckoutInput) {
    const session = await customerSessionService.getSession(token);
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, input.orderId),
        eq(orders.tenantId, session.tenantId),
        eq(orders.branchId, session.branchId),
        eq(orders.customerSessionId, session.id),
      ),
    });
    if (!order) {
      throw new ValidationError(
        "Order does not belong to this customer session",
      );
    }
    if (order.status === "CANCELLED" || order.status === "CLOSED") {
      throw new ValidationError("This order can no longer be checked out");
    }
    if (order.status !== "BILL_REQUESTED") {
      throw new ValidationError("Request the bill before making a payment");
    }

    return db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${order.id}))`,
      );
      const current = await tx.query.orders.findFirst({
        where: eq(orders.id, order.id),
        with: { payments: true },
      });
      if (!current) throw new ValidationError("Order no longer exists");

      const orderBills = await tx.query.bills.findMany({
        where: eq(bills.orderId, current.id),
      });
      const bill = input.billId
        ? orderBills.find((candidate) => candidate.id === input.billId)
        : orderBills.length === 1
          ? orderBills[0]
          : undefined;
      if (orderBills.length > 1 && !bill) {
        throw new ValidationError("Select the bill to check out");
      }
      const existing = current.payments.find(
        (payment) =>
          payment.status === "PENDING" && (!bill || payment.billId === bill.id),
      );
      if (existing) {
        return {
          payment: existing,
          orderStatus: current.status,
          paymentRequired: true,
          method: existing.method as "CASH",
        };
      }
      const successful = current.payments.find(
        (payment) =>
          payment.status === "SUCCESS" && (!bill || payment.billId === bill.id),
      );
      if (successful) {
        return {
          payment: successful,
          orderStatus: current.status,
          paymentRequired: false,
          method: "CASH" as const,
        };
      }

      let selectedBill = bill;
      if (!selectedBill) {
        const [createdBill] = await tx
          .insert(bills)
          .values({
            orderId: current.id,
            subtotal: current.subtotal,
            taxAmount: current.taxAmount,
            discountAmount: current.discountAmount,
            serviceChargeAmount: current.serviceChargeAmount,
            roundingAdjustment: current.roundingAdjustment,
            totalAmount: current.totalAmount,
          })
          .returning();
        selectedBill = createdBill!;
      }
      const [payment] = await tx
        .insert(payments)
        .values({
          orderId: current.id,
          billId: selectedBill.id,
          method: input.method,
          amount: selectedBill.totalAmount,
          status: "PENDING",
          reference: null,
        })
        .returning();

      return {
        payment: payment!,
        orderStatus: current.status,
        paymentRequired: true,
        method: input.method,
      };
    });
  },

  async getOrder(token: string, orderId: string) {
    const session = await customerSessionService.getSession(token);
    const order = await orderRepository.findById(session.tenantId, orderId);
    if (
      !order ||
      order.id !== orderId ||
      order.branchId !== session.branchId ||
      order.customerSessionId !== session.id
    ) {
      throw new ValidationError(
        "Order does not belong to this customer session",
      );
    }
    return order;
  },
};
