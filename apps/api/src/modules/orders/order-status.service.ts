import type { OrderStatus } from "@pos/types";
import type { AuthContext } from "@/core/auth";
import { ValidationError } from "@/core/errors";
import { eventBus } from "@/lib/event-bus";
import { toTableResponse } from "@/modules/tables/table.mapper";
import { toRealtimeOrderPayload } from "@/modules/realtime/realtime.mapper";
import { ticketRepository } from "@/modules/kitchen-tickets/ticket.repository";
import { tableRepository } from "@/modules/tables/table.repository";
import { cancellationReasonService } from "./cancellation-reasons/cancellation-reason.service";
import {
  assertOrderResourceAccess,
  requireOrdersPermission,
} from "./orders-authorization";
import { orderNotFound, ticketsNotServed } from "./order.errors";
import { orderRepository } from "./order.repository";
import { assertValidOrderTransition } from "./order-status.machine";

export const orderStatusService = {
  async updateStatus(
    auth: AuthContext,
    orderId: string,
    newStatus: OrderStatus,
    reason?: string,
    cancellationReasonId?: string,
    _approvalToken?: string,
  ) {
    requireOrdersPermission(
      auth,
      newStatus === "CANCELLED" ? "orders:cancel" : "orders:update_status",
    );
    const order = await orderRepository.findById(auth.tenantId, orderId);
    if (!order) throw orderNotFound(orderId);
    assertOrderResourceAccess(auth, order.branchId);

    assertValidOrderTransition(order.status, newStatus);
    if (newStatus === "CANCELLED") {
      if (!reason?.trim() && !cancellationReasonId) {
        throw new ValidationError("A cancellation reason is required");
      }
      await cancellationReasonService.assertUsable(
        auth.tenantId,
        cancellationReasonId,
      );
    }

    if (newStatus === "BILL_REQUESTED") {
      const allServed = await ticketRepository.allServed(
        auth.tenantId,
        orderId,
      );
      if (!allServed) throw ticketsNotServed();
    }

    const updated = await orderRepository.updateStatus(
      auth.tenantId,
      orderId,
      newStatus,
      auth.userId,
      reason,
      cancellationReasonId,
      order.branchId,
    );
    if (!updated) throw orderNotFound(orderId);

    const fullOrder = await orderRepository.findById(auth.tenantId, orderId);
    if (
      order.tableId &&
      (["PAID", "CLOSED", "CANCELLED"] as OrderStatus[]).includes(newStatus)
    ) {
      const updatedTable = await tableRepository.update(
        auth.tenantId,
        order.tableId,
        {
          status: "AVAILABLE",
        },
      );
      if (updatedTable) {
        await eventBus.publish(
          {
            type: "table.updated",
            payload: toTableResponse(updatedTable),
          },
          auth.tenantId,
          order.branchId,
        );
      }
    }

    await eventBus.publish(
      { type: "order.updated", payload: toRealtimeOrderPayload(fullOrder) },
      auth.tenantId,
      order.branchId,
    );

    return fullOrder;
  },
};
