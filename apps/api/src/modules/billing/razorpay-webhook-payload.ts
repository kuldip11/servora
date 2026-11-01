import { ServiceUnavailableError, ValidationError } from "@/core/errors";
import {
  razorpayWebhookPayloadSchema,
  type RazorpayWebhookPayload,
} from "@pos/contracts";
import { Value } from "@sinclair/typebox/value";
import { createHmac, timingSafeEqual } from "node:crypto";

export const verifyWebhookSignature = (
  rawBody: string,
  signature: string,
  secret: string,
) => {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
};

export const razorpayWebhookSecret = () => {
  const secret = process.env["RAZORPAY_WEBHOOK_SECRET"];
  if (!secret)
    throw new ServiceUnavailableError(
      "Razorpay webhook secret is not configured",
    );
  return secret;
};

export const parseRazorpayWebhookPayload = (
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
