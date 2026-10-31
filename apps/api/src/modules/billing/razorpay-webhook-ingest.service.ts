import { ValidationError } from "@/core/errors";
import { db } from "@/db";
import { paymentWebhookEvents } from "@/db/schema";
import { REDIS_QUEUES, redis } from "@/lib/redis";
import { eq } from "drizzle-orm";
import {
  parseRazorpayWebhookPayload,
  razorpayWebhookSecret,
  verifyWebhookSignature,
} from "./razorpay-webhook-payload";

export const razorpayWebhookIngestService = {
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
};
