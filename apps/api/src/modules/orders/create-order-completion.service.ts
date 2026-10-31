import type { AuthContext } from "@/core/auth";
import { createLogger, toError } from "@/core/logger/logger";
import { metrics } from "@/core/observability/metrics";
import { eventBus } from "@/lib/event-bus";
import { inventoryService } from "@/modules/inventory/inventory.service";
import {
  toRealtimeKitchenTicketPayload,
  toRealtimeOrderPayload,
} from "@/modules/realtime/realtime.mapper";
import { toTableResponse } from "@/modules/tables/table.mapper";
import { tableRepository } from "@/modules/tables/table.repository";
import { orderRepository } from "./order.repository";
import type { CreateOrderInput } from "./create-order.types";

const logger = createLogger({}, "create-order");

export async function completeCreatedOrder(
  auth: AuthContext,
  input: CreateOrderInput,
  branchId: string,
  order: { id: string },
) {
  const fullOrder = await orderRepository.findById(auth.tenantId, order.id);

  if (input.type === "DINE_IN" && input.tableId) {
    const updatedTable = await tableRepository.update(
      auth.tenantId,
      input.tableId,
      {
        status: "OCCUPIED",
      },
    );
    if (updatedTable) {
      await eventBus.publish(
        {
          type: "table.updated",
          payload: toTableResponse(updatedTable),
        },
        auth.tenantId,
        branchId,
      );
    }
  }

  await eventBus.publish(
    { type: "order.created", payload: toRealtimeOrderPayload(fullOrder) },
    auth.tenantId,
    branchId,
  );

  for (const createdTicket of fullOrder?.kitchenTickets ?? []) {
    await eventBus.publish(
      {
        type: "kitchen.ticket.created",
        payload: toRealtimeKitchenTicketPayload(createdTicket),
      },
      auth.tenantId,
      branchId,
    );
    if (createdTicket.status !== "FIRED") continue;
    try {
      await inventoryService.deductForOrderItemsWithRetry(
        auth.tenantId,
        branchId,
        order.id,
        createdTicket.id,
        createdTicket.items.flatMap((item) =>
          item.menuItemId === null
            ? []
            : [
                {
                  orderItemId: item.id,
                  menuItemId: item.menuItemId,
                  variantId: item.variantId,
                  quantity: item.quantity,
                  weightQuantity: item.weightQuantity,
                  weightUnit: item.weightUnit,
                  selectedOptions: item.modifiers.flatMap((modifier) =>
                    modifier.modifierId == null
                      ? []
                      : [
                          {
                            optionId: modifier.modifierId,
                            quantity: modifier.quantity,
                          },
                        ],
                  ),
                },
              ],
        ),
        auth.userId,
      );
    } catch (err) {
      metrics.increment("servora_order_processing_errors_total", {
        stage: "inventory_deduction",
      });
      logger.error("order.inventory_deduction_failed", toError(err), {
        orderId: order.id,
        branchId,
      });
    }
  }

  return fullOrder;
}
