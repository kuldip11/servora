import type { FireTicketRequest, OrderListQuery } from "@pos/contracts";
import type { OrderStatus } from "@pos/types";
import type { AuthContext } from "@/core/auth";
import {
  successResponse,
  createdResponse,
  paginatedResponse,
} from "@/core/response";
import { orderService, type CreateOrderInput } from "./order.service";
import {
  toOrderInventoryImpactResponse,
  toOrderListItemResponse,
  toOrderMergeResponse,
  toOrderResponse,
} from "./order.mapper";
import { orderExplainService } from "@/modules/menu/explain/order-explain.service";

export const orderController = {
  async explain(auth: AuthContext, orderId: string) {
    return successResponse(
      await orderExplainService.explainOrder(auth, orderId),
    );
  },
  async list(auth: AuthContext, filters: OrderListQuery) {
    const result = await orderService.list(auth, filters);
    return paginatedResponse(result.items.map(toOrderListItemResponse), {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  },

  async getById(auth: AuthContext, orderId: string) {
    const order = await orderService.getById(auth, orderId);
    return successResponse(toOrderResponse(order));
  },

  async getInventoryImpact(auth: AuthContext, orderId: string) {
    const impact = await orderService.getInventoryImpact(auth, orderId);
    return successResponse(impact.map(toOrderInventoryImpactResponse));
  },

  async create(auth: AuthContext, input: CreateOrderInput) {
    const order = await orderService.create(auth, input);
    return createdResponse(toOrderResponse(order));
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
    return successResponse(toOrderResponse(order));
  },

  async fireTicket(
    auth: AuthContext,
    orderId: string,
    input: FireTicketRequest,
  ) {
    const order = await orderService.fireTicket(auth, orderId, input);
    return successResponse(toOrderResponse(order));
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
      toOrderResponse(
        await orderService.voidItem(
          auth,
          orderId,
          orderItemId,
          reason,
          cancellationReasonId,
          approvalToken,
        ),
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
      toOrderResponse(
        await orderService.compItem(
          auth,
          orderId,
          orderItemId,
          reason,
          cancellationReasonId,
          approvalToken,
        ),
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
      toOrderResponse(
        await orderService.refireItem(
          auth,
          orderId,
          orderItemId,
          reason,
          alsoCompOriginal ?? true,
        ),
      ),
    );
  },

  async refillItem(auth: AuthContext, orderId: string, orderItemId: string) {
    return successResponse(
      toOrderResponse(
        await orderService.refillItem(auth, orderId, orderItemId),
      ),
    );
  },

  async transferTable(
    auth: AuthContext,
    orderId: string,
    newTableId: string,
    reason?: string,
  ) {
    return successResponse(
      toOrderResponse(
        await orderService.transferTable(auth, orderId, newTableId, reason),
      ),
    );
  },
  async mergeOrders(
    auth: AuthContext,
    sourceOrderId: string,
    targetOrderId: string,
  ) {
    return successResponse(
      toOrderMergeResponse(
        await orderService.mergeOrders(auth, sourceOrderId, targetOrderId),
      ),
    );
  },
};
