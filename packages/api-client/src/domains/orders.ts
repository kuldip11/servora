import type { TransportInput } from "../types";
import { voidDomainRequest } from "./shared";
import type {
  CancellationReasonResponse,
  CreateOrderRequest,
  FireTicketRequest,
  OrderExplainResponse,
  OrderResponse,
  UpdateOrderStatusRequest,
  UpdateKitchenTicketStatusRequest,
} from "@pos/contracts";
import {
  getDomainData,
  getPaginatedDomainData,
  patchDomainData,
  postDomainData,
  type DomainHttpClient,
  type PaginatedResult,
} from "./shared";

export type OrderDto = OrderResponse;
export type OrderKitchenTicketDto = OrderResponse["kitchenTickets"][number];
export type CancellationReasonDto = CancellationReasonResponse;
export type OrderExplanationDto = OrderExplainResponse;

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

export interface OrderAdjustmentReason {
  cancellationReasonId?: string;
  reason?: string;
  approvalToken?: string;
}

export const createOrdersApi = (client: DomainHttpClient) => {
  return {
    list(
      filters: OrdersListFilters = {},
      signal?: AbortSignal,
    ): Promise<PaginatedResult<OrderDto>> {
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
      return getPaginatedDomainData<OrderDto>(client, "/orders", {
        params,
        ...(signal ? { signal } : {}),
      });
    },
    get(orderId: string, signal?: AbortSignal): Promise<OrderDto> {
      return getDomainData<OrderDto>(
        client,
        `/orders/${orderId}`,
        signal ? { signal } : undefined,
      );
    },
    create(input: TransportInput<CreateOrderRequest>): Promise<OrderDto> {
      return postDomainData<OrderDto>(client, "/orders", input);
    },
    addItems(
      orderId: string,
      input: TransportInput<FireTicketRequest>,
    ): Promise<OrderDto> {
      return postDomainData<OrderDto>(
        client,
        `/orders/${orderId}/items`,
        input,
      );
    },
    updateStatus(
      orderId: string,
      input: TransportInput<UpdateOrderStatusRequest>,
    ): Promise<OrderDto> {
      return patchDomainData<OrderDto>(
        client,
        `/orders/${orderId}/status`,
        input,
      );
    },
    updateTicketStatus(
      ticketId: string,
      input: TransportInput<UpdateKitchenTicketStatusRequest>,
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
    ): Promise<OrderDto> {
      return postDomainData<OrderDto>(
        client,
        `/orders/${orderId}/items/${orderItemId}/refire`,
        { reason, alsoCompOriginal },
      );
    },
    refillItem(orderId: string, orderItemId: string): Promise<OrderDto> {
      return postDomainData<OrderDto>(
        client,
        `/orders/${orderId}/items/${orderItemId}/refill`,
      );
    },
    voidItem(
      orderId: string,
      orderItemId: string,
      reason: OrderAdjustmentReason,
    ): Promise<OrderDto> {
      return postDomainData<OrderDto>(
        client,
        `/orders/${orderId}/items/${orderItemId}/void`,
        reason,
      );
    },
    compItem(
      orderId: string,
      orderItemId: string,
      reason: OrderAdjustmentReason,
    ): Promise<OrderDto> {
      return postDomainData<OrderDto>(
        client,
        `/orders/${orderId}/items/${orderItemId}/comp`,
        reason,
      );
    },
    transferTable(
      orderId: string,
      newTableId: string,
      reason?: string,
    ): Promise<OrderDto> {
      return postDomainData<OrderDto>(
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
    listCancellationReasons(
      signal?: AbortSignal,
    ): Promise<CancellationReasonDto[]> {
      return getDomainData<CancellationReasonDto[]>(
        client,
        "/orders/cancellation-reasons",
        {
          params: { activeOnly: "true" },
          ...(signal ? { signal } : {}),
        },
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
    listAllCancellationReasons(
      signal?: AbortSignal,
    ): Promise<CancellationReasonDto[]> {
      return getDomainData<CancellationReasonDto[]>(
        client,
        "/orders/cancellation-reasons",
        signal ? { signal } : undefined,
      );
    },
    createCancellationReason(label: string): Promise<CancellationReasonDto> {
      return postDomainData<CancellationReasonDto>(
        client,
        "/orders/cancellation-reasons",
        { label },
      );
    },
    updateCancellationReason(
      id: string,
      patch: Record<string, unknown>,
    ): Promise<CancellationReasonDto> {
      return patchDomainData<CancellationReasonDto>(
        client,
        `/orders/cancellation-reasons/${id}`,
        patch,
      );
    },
    explain(
      orderId: string,
      signal?: AbortSignal,
    ): Promise<OrderExplanationDto> {
      return getDomainData<OrderExplanationDto>(
        client,
        `/orders/${orderId}/explain`,
        signal ? { signal } : undefined,
      );
    },
  };
};
