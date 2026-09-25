import {
  createBillingApi,
  createOrdersApi,
  type OrdersListFilters,
  type PaginatedResult,
} from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";
import type { CancellationReason, Order } from "@pos/types";
import {
  addOrderItemsSchema,
  updateOrderStatusSchema,
  updateKitchenTicketStatusSchema,
} from "@pos/validation";

export interface AddOrderItemInput {
  menuItemId: string;
  variantId?: string;
  quantity: number;
  chefNotes?: string;
  seatLabel?: string;
  courseNumber?: number;
  weightQuantity?: number;
  manualPrice?: number;
  selectedOptions?: Array<{
    optionId: string;
    quantity?: number;
    zoneLabel?: string;
  }>;
}

const ordersApi = createOrdersApi(apiClient);
const billingApi = createBillingApi(apiClient);

export interface AddOrderComboInput {
  comboId: string;
  quantity?: number;
  selections: Array<{ slotId: string; optionIds: string[] }>;
}

export const fetchOrders = async (
  filters: OrdersListFilters = {},
  signal?: AbortSignal,
): Promise<PaginatedResult<Order>> => {
  return ordersApi.list(filters, signal);
};

export const fetchOrder = async (
  orderId: string,
  signal?: AbortSignal,
): Promise<Order> => {
  return ordersApi.get(orderId, signal);
};

export const updateOrderStatus = async (
  id: string,
  status: string,
  reason?: { cancellationReasonId?: string; reason?: string },
): Promise<void> => {
  const validated = updateOrderStatusSchema.parse({ status });
  await ordersApi.updateStatus(id, { ...validated, ...reason });
};

export const fetchCancellationReasons = async (
  signal?: AbortSignal,
): Promise<CancellationReason[]> => {
  return ordersApi.listCancellationReasons(signal);
};

export const addOrderItems = async (
  orderId: string,
  items: AddOrderItemInput[],
  combos: AddOrderComboInput[],
  notes?: string,
  pricing?: { couponCode?: string; promotionIds?: string[] },
): Promise<{ id: string }> => {
  const validated = addOrderItemsSchema.parse({
    ...(items.length ? { items } : {}),
    ...(combos.length ? { combos } : {}),
    ...(notes !== undefined ? { notes } : {}),
    ...(pricing?.couponCode ? { couponCode: pricing.couponCode } : {}),
    ...(pricing?.promotionIds?.length
      ? { promotionIds: pricing.promotionIds }
      : {}),
  });
  return ordersApi.addItems(orderId, validated);
};

export const updateTicketStatus = async (
  ticketId: string,
  status: string,
): Promise<void> => {
  const validated = updateKitchenTicketStatusSchema.parse({ status });
  await ordersApi.updateTicketStatus(ticketId, validated);
};

export const refireOrderItem = async (
  orderId: string,
  orderItemId: string,
  reason: string,
  alsoCompOriginal = true,
): Promise<Order> => {
  return ordersApi.refireItem(orderId, orderItemId, reason, alsoCompOriginal);
};

export const refillOrderItem = async (
  orderId: string,
  orderItemId: string,
): Promise<Order> => {
  return ordersApi.refillItem(orderId, orderItemId);
};

export const setOrderItemSeatShares = async (
  orderId: string,
  orderItemId: string,
  shares: Array<{ seatLabel: string; shareRatio: number }>,
): Promise<void> => {
  await ordersApi.setItemSeatShares(orderId, orderItemId, shares);
};

export const voidOrderItem = async (
  orderId: string,
  orderItemId: string,
  reason: {
    cancellationReasonId?: string;
    reason?: string;
    approvalToken?: string;
  },
): Promise<Order> => {
  return ordersApi.voidItem(orderId, orderItemId, reason);
};

export const compOrderItem = async (
  orderId: string,
  orderItemId: string,
  reason: {
    cancellationReasonId?: string;
    reason?: string;
    approvalToken?: string;
  },
): Promise<Order> => {
  return ordersApi.compItem(orderId, orderItemId, reason);
};

export const transferOrderTable = async (
  orderId: string,
  newTableId: string,
  reason?: string,
): Promise<Order> => {
  return ordersApi.transferTable(orderId, newTableId, reason);
};

export const splitOrderBill = async (
  orderId: string,
  ways: number,
): Promise<void> => {
  await billingApi.splitOrder(orderId, ways);
};
export const splitOrderBillByItems = async (
  orderId: string,
  allocations: Array<{ label: string; orderItemIds: string[] }>,
): Promise<void> => {
  await billingApi.splitOrderByItems(orderId, allocations);
};
export const splitOrderBillBySeat = async (
  orderId: string,
  sharedItemStrategy: "EVEN_SPLIT" | "MANUAL",
) => {
  return billingApi.splitOrderBySeat(orderId, sharedItemStrategy);
};

export const mergeOrders = async (
  sourceOrderId: string,
  targetOrderId: string,
): Promise<void> => {
  await ordersApi.merge(sourceOrderId, targetOrderId);
};
