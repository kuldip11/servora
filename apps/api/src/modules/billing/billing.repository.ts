import { billingPaymentRepository } from "./billing-payment.repository";
import { billingQueryRepository } from "./billing-query.repository";
import { billingRefundRepository } from "./billing-refund.repository";
import { billingSplitRepository } from "./billing-split.repository";

export type { RecordPaymentResult } from "./billing-payment.repository";
export type { RecordRefundResult } from "./billing-refund.repository";

/** Stable facade over payment, split, refund, and billing-query persistence. */
export const billingRepository = {
  ...billingPaymentRepository,
  ...billingSplitRepository,
  ...billingQueryRepository,
  ...billingRefundRepository,
};
