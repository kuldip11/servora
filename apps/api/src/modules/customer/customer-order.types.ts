import type { ComboOrderSelection } from "@/modules/menu/combos/combo-order.service";
import type { OrderItemInput } from "@/modules/orders/pricing/pricing-pipeline";

export type CreateCustomerOrderInput = {
  fulfillmentType?: "DINE_IN" | "TAKEAWAY";
  items?: OrderItemInput[];
  combos?: ComboOrderSelection[];
  notes?: string;
  couponCode?: string;
  loyaltyPhone?: string;
};
