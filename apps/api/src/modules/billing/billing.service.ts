import { billingPaymentService } from "./billing-payment.service";
import { billingQueryService } from "./billing-query.service";
import { billingRefundService } from "./billing-refund.service";
import { billingSplitService } from "./billing-split.service";

export type { CreatePaymentInput, CreateRefundInput } from "./billing.types";

export const billingService = {
  ...billingPaymentService,
  ...billingSplitService,
  ...billingRefundService,
  ...billingQueryService,
};
