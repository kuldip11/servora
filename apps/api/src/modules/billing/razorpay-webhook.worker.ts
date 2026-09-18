import Redis from "ioredis";
import { and, inArray, lte, or, isNull } from "drizzle-orm";
import { db } from "@/db";
import { paymentWebhookEvents } from "@/db/schema";
import { razorpayWebhookService } from "./razorpay-webhook.service";
import { metrics } from "@/core/observability/metrics";
import { createLogger, toError } from "@/core/logger/logger";

import { RAZORPAY_WEBHOOK_QUEUE } from "./constants";
const logger = createLogger({}, "razorpay-webhook-worker");
const queueUrl = process.env["REDIS_URL"];

const recoverDurableEvents = async () => {
  const now = new Date();
  const events = await db.query.paymentWebhookEvents.findMany({
    where: and(
      inArray(paymentWebhookEvents.status, ["RECEIVED", "FAILED"]),
      or(
        isNull(paymentWebhookEvents.nextAttemptAt),
        lte(paymentWebhookEvents.nextAttemptAt, now),
      ),
    ),
    columns: { eventId: true },
    limit: 100,
  });
  if (!events.length) return;
  const redis = new Redis(queueUrl!, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });
  try {
    for (const event of events)
      await redis.lpush(RAZORPAY_WEBHOOK_QUEUE, event.eventId);
    await db
      .update(paymentWebhookEvents)
      .set({ nextAttemptAt: new Date(Date.now() + 30_000) })
      .where(
        inArray(
          paymentWebhookEvents.eventId,
          events.map((event) => event.eventId),
        ),
      );
  } finally {
    await redis.quit();
  }
};

export const startRazorpayWebhookWorker = () => {
  if (!queueUrl) {
    throw new Error("REDIS_URL environment variable is required");
  }

  const workerRedis = new Redis(queueUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
  let stopped = false;
  let recoveryTimer: ReturnType<typeof setInterval> | undefined;

  const run = async () => {
    while (!stopped) {
      try {
        const result = await workerRedis.brpop(RAZORPAY_WEBHOOK_QUEUE, 5);
        if (!result) continue;
        const eventId = result[1];
        try {
          await razorpayWebhookService.processEvent(eventId);
        } catch (error) {
          metrics.increment("servora_payment_webhook_failures_total", {
            stage: "worker",
          });
          logger.error("razorpay_worker.event_failed", toError(error), { eventId });
        }
      } catch (error) {
        if (!stopped) {
          metrics.increment("servora_payment_webhook_failures_total", {
            stage: "queue",
          });
          logger.error("razorpay_worker.redis_error", toError(error));
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }
  };

  recoveryTimer = setInterval(() => {
    void recoverDurableEvents().catch((error) =>
      logger.error("razorpay_worker.recovery_scan_failed", toError(error)),
    );
  }, 30_000);
  void recoverDurableEvents().catch((error) =>
    logger.error("razorpay_worker.initial_recovery_scan_failed", toError(error)),
  );
  void run();

  return () => {
    stopped = true;
    if (recoveryTimer) clearInterval(recoveryTimer);
    void workerRedis.quit();
  };
};
