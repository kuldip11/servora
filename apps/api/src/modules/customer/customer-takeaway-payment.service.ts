import { and, eq, sql } from "drizzle-orm";
import { ValidationError } from "@/core/errors";
import { createLogger, toError } from "@/core/logger/logger";
import { db } from "@/db";
import { bills, kitchenTickets, orders, payments } from "@/db/schema";
import { eventBus } from "@/lib/event-bus";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { orderRepository } from "@/modules/orders/order.repository";
import {
  toRealtimeKitchenTicketPayload,
  toRealtimeOrderPayload,
} from "@/modules/realtime/realtime.mapper";
import { customerSessionService } from "./customer-session.service";
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  verifyRazorpaySignature,
} from "./razorpay-client";

const logger = createLogger({}, "customer-payment");

export const customerTakeawayPaymentService = {
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
        logger.error(
          "customer_payment.inventory_deduction_failed",
          toError(err),
          {
            orderId: order.id,
            branchId: session.branchId,
          },
        );
      }
      const updated = await orderRepository.findById(
        session.tenantId,
        order.id,
      );
      await eventBus.publish(
        { type: "order.updated", payload: toRealtimeOrderPayload(updated) },
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
            payload: toRealtimeKitchenTicketPayload(releasedTicket),
          },
          session.tenantId,
          session.branchId,
        );
      }
      return updated;
    }
    return orderRepository.findById(session.tenantId, order.id);
  },
};
