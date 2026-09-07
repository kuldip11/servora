import { createOrdersApi, type OrdersListFilters } from "@pos/api-client";
import type { CreateOrderInput as ValidatedCreateOrderInput } from "@pos/validation";
import { apiClient } from "@/shared/lib/api-client";
import type { Order } from "@pos/types";
import type { CartItem } from "@/features/orders/utils/cartTypes";

export type CreateOrderInput = ValidatedCreateOrderInput;
export type { OrdersListFilters };

export interface AddOrderItemsInput {
  notes?: string | undefined;
  items: CartItemPayload[];
}

interface CartItemPayload {
  menuItemId: string;
  quantity: number;
  variantId?: string | undefined;
  chefNotes?: string | undefined;
  seatLabel?: string | undefined;
  courseNumber?: number | undefined;
  selectedOptions: { optionId: string; quantity: number }[];
}

const ordersApi = createOrdersApi(apiClient);

export const toCartItemPayload = (item: CartItem): CartItemPayload => {
  return {
    menuItemId: item.menuItemId,
    quantity: item.quantity,
    ...(item.variantId !== undefined && { variantId: item.variantId }),
    ...(item.chefNotes && { chefNotes: item.chefNotes }),
    ...(item.seatLabel && { seatLabel: item.seatLabel }),
    ...(item.courseNumber !== undefined && { courseNumber: item.courseNumber }),
    selectedOptions: item.modifiers.map((m) => ({
      optionId: m.optionId,
      quantity: m.quantity,
    })),
  };
};

export const ordersService = {
  list: ordersApi.list,
  search: ordersApi.search,
  detail: ordersApi.get,
  create: ordersApi.create,
  addItems(orderId: string, input: AddOrderItemsInput): Promise<Order> {
    return ordersApi.addItems(orderId, input);
  },
  updateStatus(
    orderId: string,
    status: string,
    reason?: { cancellationReasonId?: string; reason?: string },
  ): Promise<Order> {
    return ordersApi.updateStatus(orderId, {
      status: status as
        "OPEN" | "BILL_REQUESTED" | "PAID" | "CLOSED" | "CANCELLED",
      ...reason,
    });
  },
  updateTicketStatus(ticketId: string, status: string): Promise<void> {
    return ordersApi.updateTicketStatus(ticketId, {
      status: status as "HELD" | "FIRED" | "PREPARING" | "READY" | "SERVED",
    });
  },
  refireItem: ordersApi.refireItem,
  voidItem: ordersApi.voidItem,
  compItem: ordersApi.compItem,
  transferTable: ordersApi.transferTable,
  mergeOrders: ordersApi.merge,
};
