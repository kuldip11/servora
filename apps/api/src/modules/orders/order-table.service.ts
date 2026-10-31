import type { AuthContext } from "@/core/auth";
import { eventBus } from "@/lib/event-bus";
import {
  toRealtimeKitchenTicketPayload,
  toRealtimeOrderPayload,
} from "@/modules/realtime/realtime.mapper";
import { ticketRepository } from "@/modules/kitchen-tickets/ticket.repository";
import { tableRepository } from "@/modules/tables/table.repository";
import { toTableResponse } from "@/modules/tables/table.mapper";
import {
  assertOrderResourceAccess,
  requireOrdersPermission,
} from "./orders-authorization";
import {
  branchRequiredForOrder,
  orderCannotMerge,
  orderCannotTransferTable,
  orderNotFound,
} from "./order.errors";
import { orderRepository } from "./order.repository";

export const orderTableService = {
  async transferTable(
    auth: AuthContext,
    orderId: string,
    newTableId: string,
    reason?: string,
  ) {
    requireOrdersPermission(auth, "orders:update");
    const order = await orderRepository.findById(auth.tenantId, orderId);
    if (!order) throw orderNotFound(orderId);
    assertOrderResourceAccess(auth, order.branchId);
    if (order.status !== "OPEN" || order.type !== "DINE_IN" || !order.tableId) {
      throw orderCannotTransferTable(
        "Only an open dine-in order can be transferred",
      );
    }
    if (order.tableId === newTableId) {
      throw orderCannotTransferTable(
        "The destination must be a different table",
      );
    }

    const [oldTable, newTable] = await Promise.all([
      tableRepository.findById(auth.tenantId, order.tableId),
      tableRepository.findById(auth.tenantId, newTableId),
    ]);
    if (
      !oldTable ||
      !newTable ||
      newTable.branchId !== order.branchId ||
      !newTable.isActive
    ) {
      throw orderCannotTransferTable(
        "The destination table is not available in this branch",
      );
    }
    if (newTable.status !== "AVAILABLE") {
      throw orderCannotTransferTable("The destination table is not available");
    }

    const transferred = await tableRepository.transferOrderTable({
      tenantId: auth.tenantId,
      branchId: order.branchId,
      orderId,
      oldTableId: order.tableId,
      newTableId,
      customerSessionId: order.customerSessionId,
      changedBy: auth.userId,
      oldTableName: oldTable.name,
      newTableName: newTable.name,
      ...(reason !== undefined ? { reason } : {}),
    });
    if (!transferred) {
      throw orderCannotTransferTable(
        "The destination table was claimed by another order",
      );
    }

    const fullOrder = await orderRepository.findById(auth.tenantId, orderId);
    await Promise.all([
      eventBus.publish(
        {
          type: "table.updated",
          payload: toTableResponse(transferred.oldTable),
        },
        auth.tenantId,
        order.branchId,
      ),
      eventBus.publish(
        {
          type: "table.updated",
          payload: toTableResponse(transferred.newTable),
        },
        auth.tenantId,
        order.branchId,
      ),
      eventBus.publish(
        { type: "order.updated", payload: toRealtimeOrderPayload(fullOrder) },
        auth.tenantId,
        order.branchId,
      ),
    ]);

    for (const ticket of fullOrder?.kitchenTickets ?? []) {
      if (ticket.status === "SERVED") continue;
      const detailed = await ticketRepository.findDetailedById(
        auth.tenantId,
        ticket.id,
      );
      if (detailed) {
        await eventBus.publish(
          {
            type: "kitchen.ticket.updated",
            payload: toRealtimeKitchenTicketPayload(detailed),
          },
          auth.tenantId,
          order.branchId,
        );
      }
    }
    return fullOrder;
  },

  async mergeOrders(
    auth: AuthContext,
    sourceOrderId: string,
    targetOrderId: string,
  ) {
    requireOrdersPermission(auth, "orders:update");
    if (!auth.branchId) throw branchRequiredForOrder();
    const result = await orderRepository.mergeOrders({
      tenantId: auth.tenantId,
      branchId: auth.branchId,
      sourceOrderId,
      targetOrderId,
    });
    if (result.status === "not_found") throw orderNotFound(sourceOrderId);
    if (result.status === "same_order")
      throw orderCannotMerge("An order cannot be merged into itself");
    if (result.status === "closed") {
      throw orderCannotMerge(
        "Paid, closed, or cancelled orders cannot be merged",
      );
    }
    if (result.status === "already_merged") {
      throw orderCannotMerge(
        "This would create a merge chain or duplicate merge",
      );
    }

    const [source, target] = await Promise.all([
      orderRepository.findById(auth.tenantId, sourceOrderId),
      orderRepository.findById(auth.tenantId, targetOrderId),
    ]);
    await Promise.all([
      eventBus.publish(
        { type: "order.updated", payload: toRealtimeOrderPayload(source) },
        auth.tenantId,
        auth.branchId,
      ),
      eventBus.publish(
        { type: "order.updated", payload: toRealtimeOrderPayload(target) },
        auth.tenantId,
        auth.branchId,
      ),
    ]);
    return { source, target };
  },
};
