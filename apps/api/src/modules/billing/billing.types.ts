import type { PaymentMethod } from "@pos/types";

export interface CreatePaymentInput {
  orderId: string;
  idempotencyKey?: string | undefined;
  billId?: string | undefined;
  method: PaymentMethod;
  amount: number;
  reference?: string | undefined;
}

export interface CreateRefundInput {
  paymentId: string;
  amount: number;
  reason: string;
}
