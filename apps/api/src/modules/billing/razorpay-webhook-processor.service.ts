import { createLogger } from "@/core/logger/logger";
import { db } from "@/db";
import { kitchenTickets, payments, paymentWebhookEvents } from "@/db/schema";
import { eventBus } from "@/lib/event-bus";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { orderRepository } from "@/modules/orders/order.repository";
import {
  toRealtimeKitchenTicketPayload,
  toRealtimeOrderPayload,
} from "@/modules/realtime/realtime.mapper";
import { and, eq, sql } from "drizzle-orm";
import { parseRazorpayWebhookPayload } from "./razorpay-webhook-payload";

const logger = createLogger({}, "razorpay-webhook");

export const razorpayWebhookProcessorService = {
  async processEvent(eventId: string) {
    const event = await db.query.paymentWebhookEvents.findFirst({
      where: eq(paymentWebhookEvents.eventId, eventId),
    });
    if (!event) return { processed: false, reason: "not_found" as const };
    if (event.status === "PROCESSED")
      return { processed: true, duplicate: true };

    try {
      const payload = parseRazorpayWebhookPayload(event.payload);
      const eventType = payload.event ?? event.eventType;
      const paymentEntity = payload.payload?.payment?.entity;
      const orderEntity = payload.payload?.order?.entity;
      const gatewayOrderId = paymentEntity?.order_id ?? orderEntity?.id;
      const gatewayPaymentId = paymentEntity?.id;

      if (
        (eventType === "payment.captured" || eventType === "order.paid") &&
        gatewayOrderId &&
        gatewayPaymentId
      ) {
        const payment = await db.query.payments.findFirst({
          where: and(
            eq(payments.method, "RAZORPAY"),
            eq(payments.gatewayOrderId, gatewayOrderId),
          ),
          with: { order: true },
        });
        if (
          payment &&
          payment.status !== "SUCCESS" &&
          paymentEntity?.status === "captured" &&
          paymentEntity.currency === "INR" &&
          paymentEntity.amount === Math.round(Number(payment.amount) * 100)
        ) {
          const releasedTicketIds = await db.transaction(async (tx) => {
            await tx.execute(
              sql`select pg_advisory_xact_lock(hashtext(${payment.orderId}))`,
            );
            const current = await tx.query.payments.findFirst({
              where: eq(payments.id, payment.id),
            });
            if (!current || current.status === "SUCCESS") return [] as string[];
            const pending = await tx.query.kitchenTickets.findMany({
              where: and(
                eq(kitchenTickets.orderId, current.orderId),
                eq(kitchenTickets.status, "PENDING_PAYMENT"),
              ),
              with: { course: true },
            });
            await tx
              .update(payments)
              .set({
                status: "SUCCESS",
                reference: gatewayPaymentId,
                gatewayPaymentId,
                gatewayOrderId,
                updatedAt: new Date(),
              })
              .where(eq(payments.id, payment.id));
            const firedIds: string[] = [];
            for (const ticket of pending) {
              const status =
                ticket.course && ticket.course.courseNumber > 1
                  ? "HELD"
                  : "FIRED";
              await tx
                .update(kitchenTickets)
                .set({
                  status,
                  firedAt: status === "FIRED" ? new Date() : null,
                  updatedAt: new Date(),
                })
                .where(eq(kitchenTickets.id, ticket.id));
              if (status === "FIRED") firedIds.push(ticket.id);
            }
            return firedIds;
          });

          if (releasedTicketIds.length) {
            const order = await orderRepository.findById(
              payment.order.tenantId,
              payment.orderId,
            );
            if (order) {
              for (const ticketId of releasedTicketIds) {
                const ticketItems = order.items.filter(
                  (item) => item.kitchenTicketId === ticketId,
                );
                const result =
                  await inventoryService.deductForOrderItemsWithRetry(
                    payment.order.tenantId,
                    payment.order.branchId,
                    payment.orderId,
                    ticketId,
                    ticketItems.flatMap((item) =>
                      item.menuItemId == null
                        ? []
                        : [
                            {
                              orderItemId: item.id,
                              menuItemId: item.menuItemId,
                              variantId: item.variantId,
                              quantity: item.quantity,
                              selectedOptions: item.modifiers.flatMap(
                                (modifier) =>
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
                if (result?.short.length)
                  logger.warn("razorpay.inventory_short", {
                    orderId: payment.orderId,
                    short: result.short,
                  });
              }
              const updated = await orderRepository.findById(
                payment.order.tenantId,
                payment.orderId,
              );
              if (updated) {
                await eventBus.publish(
                  {
                    type: "order.updated",
                    payload: toRealtimeOrderPayload(updated),
                  },
                  payment.order.tenantId,
                  payment.order.branchId,
                );
                for (const ticket of updated.kitchenTickets.filter(
                  (candidate) => releasedTicketIds.includes(candidate.id),
                )) {
                  await eventBus.publish(
                    {
                      type: "kitchen.ticket.created",
                      payload: toRealtimeKitchenTicketPayload(ticket),
                    },
                    payment.order.tenantId,
                    payment.order.branchId,
                  );
                }
              }
            }
          }
        }
      }

      if (
        eventType === "payment.failed" &&
        gatewayOrderId &&
        gatewayPaymentId
      ) {
        await db
          .update(payments)
          .set({
            status: "FAILED",
            reference: gatewayPaymentId,
            gatewayPaymentId,
            gatewayOrderId,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(payments.method, "RAZORPAY"),
              eq(payments.gatewayOrderId, gatewayOrderId),
              eq(payments.status, "PENDING"),
            ),
          );
      }

      await db
        .update(paymentWebhookEvents)
        .set({
          status: "PROCESSED",
          processedAt: new Date(),
          nextAttemptAt: null,
          error: null,
        })
        .where(eq(paymentWebhookEvents.eventId, eventId));
      return { processed: true, duplicate: false };
    } catch (error) {
      await db
        .update(paymentWebhookEvents)
        .set({
          status: "FAILED",
          attemptCount: sql`${paymentWebhookEvents.attemptCount} + 1`,
          nextAttemptAt: new Date(Date.now() + 30_000),
          error: error instanceof Error ? error.message : String(error),
        })
        .where(eq(paymentWebhookEvents.eventId, eventId));
      throw error;
    }
  },
};
