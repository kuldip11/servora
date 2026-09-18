import { createLogger } from "@/core/logger/logger";
import { and, eq, sql } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { KitchenTicket, Order } from "@pos/types";
import { Value } from "@sinclair/typebox/value";
import {
  razorpayWebhookPayloadSchema,
  type RazorpayWebhookPayload,
} from "@pos/contracts";
import { db } from "@/db";
import { paymentWebhookEvents, payments, kitchenTickets } from "@/db/schema";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { eventBus } from "@/lib/event-bus";
import { orderRepository } from "@/modules/orders/order.repository";
import { redis, REDIS_QUEUES } from "@/lib/redis";
import { ServiceUnavailableError, ValidationError } from "@/core/errors";

const logger = createLogger({}, "razorpay-webhook");

const verifyWebhookSignature = (
  rawBody: string,
  signature: string,
  secret: string,
) => {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
};

const razorpayWebhookSecret = () => {
  const secret = process.env["RAZORPAY_WEBHOOK_SECRET"];
  if (!secret)
    throw new ServiceUnavailableError(
      "Razorpay webhook secret is not configured",
    );
  return secret;
};

const parseRazorpayWebhookPayload = (
  rawBody: string,
): RazorpayWebhookPayload => {
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    throw new ValidationError("Invalid Razorpay webhook payload");
  }
  if (!Value.Check(razorpayWebhookPayloadSchema, payload))
    throw new ValidationError("Invalid Razorpay webhook payload");
  return payload;
};

export const razorpayWebhookService = {
  async handle(
    rawBody: string,
    signature: string | undefined,
    eventId: string | undefined,
  ) {
    if (!signature || !eventId)
      throw new ValidationError(
        "Razorpay webhook signature and event id are required",
      );
    if (!verifyWebhookSignature(rawBody, signature, razorpayWebhookSecret()))
      throw new ValidationError("Invalid Razorpay webhook signature");

    const payload = parseRazorpayWebhookPayload(rawBody);

    const eventType = payload.event ?? "unknown";
    const inserted = await db.transaction(async (tx) => {
      const existing = await tx.query.paymentWebhookEvents.findFirst({
        where: eq(paymentWebhookEvents.eventId, eventId),
      });
      if (existing) {
        if (existing.status === "PROCESSED") return "PROCESSED" as const;
        await tx
          .update(paymentWebhookEvents)
          .set({
            eventType,
            payload: rawBody,
            status: "RECEIVED",
            nextAttemptAt: null,
            error: null,
          })
          .where(eq(paymentWebhookEvents.eventId, eventId));
        return "RETRY" as const;
      }
      await tx.insert(paymentWebhookEvents).values({
        eventId,
        eventType,
        payload: rawBody,
        status: "RECEIVED",
        nextAttemptAt: null,
      });
      return "INSERTED" as const;
    });

    if (inserted === "PROCESSED") return { duplicate: true, queued: false };

    await redis.lpush(REDIS_QUEUES.RAZORPAY_WEBHOOKS, eventId);
    return { duplicate: inserted === "RETRY", queued: true };
  },

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
                    payload: updated as unknown as Order,
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
                      payload: ticket as unknown as KitchenTicket,
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
