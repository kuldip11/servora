import { Elysia } from "elysia";
import { razorpayWebhookService } from "./razorpay-webhook.service";
import { AppError, ServiceUnavailableError } from "@/core/errors";
import { successResponse } from "@/core/response";
import { metrics } from "@/core/observability/metrics";
import {
  razorpayWebhookIngressResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";

export const razorpayWebhookRouter = new Elysia({
  prefix: "/api/webhooks",
}).post(
  "/razorpay",
  async ({ request, set }) => {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? undefined;
    const eventId = request.headers.get("x-razorpay-event-id") ?? undefined;
    try {
      const result = await razorpayWebhookService.handle(
        rawBody,
        signature,
        eventId,
      );
      set.status = 200;
      return successResponse(result);
    } catch (error) {
      metrics.increment("servora_payment_webhook_failures_total", {
        stage: "ingress",
      });
      if (AppError.isAppError(error)) throw error;
      throw new ServiceUnavailableError(
        "Razorpay webhook processing is temporarily unavailable",
      );
    }
  },
  {
    response: {
      200: razorpayWebhookIngressResponseSchema,
      ...standardErrorResponseSchemas,
    },
  },
);
