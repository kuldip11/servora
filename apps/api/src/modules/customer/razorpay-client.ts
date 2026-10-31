import { createHmac, timingSafeEqual } from "node:crypto";
import { ValidationError } from "@/core/errors";

const razorpayConfig = () => ({
  keyId: process.env["RAZORPAY_KEY_ID"],
  keySecret: process.env["RAZORPAY_KEY_SECRET"],
});

export const createRazorpayOrder = async (amount: string, receipt: string) => {
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

export const verifyRazorpaySignature = (
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

export const fetchRazorpayPayment = async (paymentId: string) => {
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
