import { voidDomainRequest } from "./shared";
import type { CancellationReason, Order } from "@pos/types";
import type {
  AddOrderItemsInput,
  CreateOrderInput,
  UpdateOrderStatusInput,
  UpdateKitchenTicketStatusInput,
} from "@pos/validation";
import {
  getDomainData,
  getPaginatedDomainData,
  patchDomainData,
  postDomainData,
  type DomainHttpClient,
  type PaginatedResult,
} from "./shared";

export interface OrdersListFilters {
  status?: string;
  type?: string;
  search?: string;
  view?: "READY" | "ACTIVE" | "ALL";
  page?: number;
  limit?: number;
  sortBy?: "id" | "total" | "createdAt";
  sortDirection?: "asc" | "desc";
}

export interface OrderSearchResult {
  id: string;
  status: Order["status"];
  type: Order["type"];
  createdAt: string | Date;
  tableId: string | null;
  tableName: string | null;
}

export interface OrderAdjustmentReason {
  cancellationReasonId?: string;
  reason?: string;
  approvalToken?: string;
}

export const createOrdersApi = (client: DomainHttpClient) => {
  return {
    list(filters: OrdersListFilters = {}): Promise<PaginatedResult<Order>> {
      const params: Record<string, string> = {};
      if (filters.status) params["status"] = filters.status;
      if (filters.type) params["type"] = filters.type;
      if (filters.search) params["search"] = filters.search;
      if (filters.view && filters.view !== "ALL") params["view"] = filters.view;
      params["page"] = String(filters.page ?? 1);
      params["limit"] = String(filters.limit ?? 25);
      if (filters.sortBy) params["sortBy"] = filters.sortBy;
      if (filters.sortDirection)
        params["sortDirection"] = filters.sortDirection;
      return getPaginatedDomainData<Order>(client, "/orders", { params });
    },
    search(query: string, limit = 8): Promise<OrderSearchResult[]> {
      return getDomainData<OrderSearchResult[]>(client, "/orders/search", {
        params: { q: query, limit: String(limit) },
      });
    },
    get(orderId: string): Promise<Order> {
      return getDomainData<Order>(client, `/orders/${orderId}`);
    },
    create(input: CreateOrderInput): Promise<Order> {
      return postDomainData<Order>(client, "/orders", input);
    },
    addItems(orderId: string, input: AddOrderItemsInput): Promise<Order> {
      return postDomainData<Order>(client, `/orders/${orderId}/items`, input);
    },
    updateStatus(
      orderId: string,
      input: UpdateOrderStatusInput & { cancellationReasonId?: string },
    ): Promise<Order> {
      return patchDomainData<Order>(client, `/orders/${orderId}/status`, input);
    },
    updateTicketStatus(
      ticketId: string,
      input: UpdateKitchenTicketStatusInput,
    ): Promise<void> {
      return voidDomainRequest(
        client.patch(`/kitchen-tickets/${ticketId}/status`, input),
      );
    },
    refireItem(
      orderId: string,
      orderItemId: string,
      reason: string,
      alsoCompOriginal = true,
    ): Promise<Order> {
      return postDomainData<Order>(
        client,
        `/orders/${orderId}/items/${orderItemId}/refire`,
        { reason, alsoCompOriginal },
      );
    },
    refillItem(orderId: string, orderItemId: string): Promise<Order> {
      return postDomainData<Order>(
        client,
        `/orders/${orderId}/items/${orderItemId}/refill`,
      );
    },
    voidItem(
      orderId: string,
      orderItemId: string,
      reason: OrderAdjustmentReason,
    ): Promise<Order> {
      return postDomainData<Order>(
        client,
        `/orders/${orderId}/items/${orderItemId}/void`,
        reason,
      );
    },
    compItem(
      orderId: string,
      orderItemId: string,
      reason: OrderAdjustmentReason,
    ): Promise<Order> {
      return postDomainData<Order>(
        client,
        `/orders/${orderId}/items/${orderItemId}/comp`,
        reason,
      );
    },
    transferTable(
      orderId: string,
      newTableId: string,
      reason?: string,
    ): Promise<Order> {
      return postDomainData<Order>(
        client,
        `/orders/${orderId}/transfer-table`,
        {
          newTableId,
          ...(reason?.trim() ? { reason: reason.trim() } : {}),
        },
      );
    },
    merge(sourceOrderId: string, targetOrderId: string): Promise<void> {
      return voidDomainRequest(
        client.post(`/orders/${sourceOrderId}/merge`, { targetOrderId }),
      );
    },
    listCancellationReasons(): Promise<CancellationReason[]> {
      return getDomainData<CancellationReason[]>(
        client,
        "/orders/cancellation-reasons",
        { params: { activeOnly: "true" } },
      );
    },
    setItemSeatShares(
      orderId: string,
      orderItemId: string,
      shares: Array<{ seatLabel: string; shareRatio: number }>,
    ): Promise<void> {
      return voidDomainRequest(
        client.put(`/orders/${orderId}/items/${orderItemId}/seat-shares`, {
          shares,
        }),
      );
    },
    listAllCancellationReasons(): Promise<CancellationReason[]> {
      return getDomainData<CancellationReason[]>(
        client,
        "/orders/cancellation-reasons",
      );
    },
    createCancellationReason(label: string): Promise<CancellationReason> {
      return postDomainData<CancellationReason>(
        client,
        "/orders/cancellation-reasons",
        { label },
      );
    },
    updateCancellationReason(
      id: string,
      patch: Record<string, unknown>,
    ): Promise<CancellationReason> {
      return patchDomainData<CancellationReason>(
        client,
        `/orders/cancellation-reasons/${id}`,
        patch,
      );
    },
    explain<T>(orderId: string): Promise<T> {
      return getDomainData<T>(client, `/orders/${orderId}/explain`);
    },
  };
};
