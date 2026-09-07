import type { OrderStatus } from "@pos/types";
import type { AuthContext } from "@/core/auth";
import {
  successResponse,
  createdResponse,
  paginatedResponse,
} from "@/core/response";
import {
  orderService,
  type CreateOrderInput,
  type FireTicketInput,
} from "./order.service";
import { orderExplainService } from "@/modules/menu/explain/order-explain.service";

export const orderController = {
  async explain(auth: AuthContext, orderId: string) {
    return successResponse(
      await orderExplainService.explainOrder(auth, orderId),
    );
  },
  async list(
    auth: AuthContext,
    filters: {
      status?: string | undefined;
      type?: string | undefined;
      search?: string | undefined;
      view?: "READY" | "ACTIVE" | "ALL" | undefined;
      page?: number | undefined;
      limit?: number | undefined;
      sortBy?: "id" | "total" | "createdAt" | undefined;
      sortDirection?: "asc" | "desc" | undefined;
    },
  ) {
    const result = await orderService.list(auth, filters);
    return paginatedResponse(result.items, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  },

  async search(
    auth: AuthContext,
    query: { q: string; limit?: number | undefined },
  ) {
    return successResponse(
      await orderService.search(auth, query.q, query.limit),
    );
  },

  async getById(auth: AuthContext, orderId: string) {
    const order = await orderService.getById(auth, orderId);
    return successResponse(order);
  },

  async getInventoryImpact(auth: AuthContext, orderId: string) {
    const impact = await orderService.getInventoryImpact(auth, orderId);
    return successResponse(impact);
  },

  async create(auth: AuthContext, input: CreateOrderInput) {
    const order = await orderService.create(auth, input);
    return createdResponse(order);
  },

  async updateStatus(
    auth: AuthContext,
    orderId: string,
    status: OrderStatus,
    reason: string | undefined,
    cancellationReasonId?: string | undefined,
    approvalToken?: string | undefined,
  ) {
    const order = await orderService.updateStatus(
      auth,
      orderId,
      status,
      reason,
      cancellationReasonId,
    );
    return successResponse(order);
  },

  async fireTicket(auth: AuthContext, orderId: string, input: FireTicketInput) {
    const order = await orderService.fireTicket(auth, orderId, input);
    return successResponse(order);
  },

  async voidItem(
    auth: AuthContext,
    orderId: string,
    orderItemId: string,
    reason: string | undefined,
    cancellationReasonId?: string | undefined,
    approvalToken?: string | undefined,
  ) {
    return successResponse(
      await orderService.voidItem(
        auth,
        orderId,
        orderItemId,
        reason,
        cancellationReasonId,
        approvalToken,
      ),
    );
  },

  async compItem(
    auth: AuthContext,
    orderId: string,
    orderItemId: string,
    reason: string | undefined,
    cancellationReasonId?: string | undefined,
    approvalToken?: string | undefined,
  ) {
    return successResponse(
      await orderService.compItem(
        auth,
        orderId,
        orderItemId,
        reason,
        cancellationReasonId,
        approvalToken,
      ),
    );
  },

  async refireItem(
    auth: AuthContext,
    orderId: string,
    orderItemId: string,
    reason: string,
    alsoCompOriginal?: boolean,
  ) {
    return successResponse(
      await orderService.refireItem(
        auth,
        orderId,
        orderItemId,
        reason,
        alsoCompOriginal ?? true,
      ),
    );
  },

  async refillItem(auth: AuthContext, orderId: string, orderItemId: string) {
    return successResponse(
      await orderService.refillItem(auth, orderId, orderItemId),
    );
  },

  async transferTable(
    auth: AuthContext,
    orderId: string,
    newTableId: string,
    reason?: string,
  ) {
    return successResponse(
      await orderService.transferTable(auth, orderId, newTableId, reason),
    );
  },
  async mergeOrders(
    auth: AuthContext,
    sourceOrderId: string,
    targetOrderId: string,
  ) {
    return successResponse(
      await orderService.mergeOrders(auth, sourceOrderId, targetOrderId),
    );
  },
};
