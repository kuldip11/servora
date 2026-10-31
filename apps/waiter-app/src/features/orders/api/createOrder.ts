import { createOrdersApi } from "@pos/api-client";
import type { OrderDto as Order } from "@pos/api-client";
import type { AddOrderItemInput } from "./orders";
import { createOrderSchema } from "@pos/validation";
import { apiClient } from "@/shared/lib/api-client";

const ordersApi = createOrdersApi(apiClient);

export interface CreateOrderComboInput {
  comboId: string;
  quantity?: number;
  selections: Array<{ slotId: string; optionIds: string[] }>;
}

export interface CreateOrderInput {
  type: "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ONLINE";
  tableId?: string;
  customerId?: string;
  customerGroupId?: string;
  billingMode?: "LINE_ITEMS" | "PER_COVER";
  coverCount?: number;
  perCoverPriceRuleId?: string;
  notes?: string;
  couponCode?: string;
  promotionIds?: string[];
  items?: AddOrderItemInput[];
  combos?: CreateOrderComboInput[];
}

export const createOrder = async (input: CreateOrderInput): Promise<Order> => {
  return ordersApi.create(createOrderSchema.parse(input));
};
