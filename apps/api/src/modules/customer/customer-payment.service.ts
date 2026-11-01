import { customerCheckoutService } from "./customer-checkout.service";
import { customerPaymentQueryService } from "./customer-payment-query.service";
import { customerTakeawayPaymentService } from "./customer-takeaway-payment.service";

export type { CustomerCheckoutInput } from "./customer-payment.types";

export const customerPaymentService = {
  ...customerTakeawayPaymentService,
  ...customerCheckoutService,
  ...customerPaymentQueryService,
};
