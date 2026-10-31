import type { AuthContext } from "@/core/auth";
import { createLogger, toError } from "@/core/logger/logger";
import { eventBus } from "@/lib/event-bus";
import { inventoryService } from "@/modules/inventory/inventory.service";
import {
  toRealtimeKitchenTicketPayload,
  toRealtimeOrderPayload,
} from "@/modules/realtime/realtime.mapper";
import { orderRepository } from "./order.repository";

const logger = createLogger({}, "order-fire");

type FireOrder = NonNullable<
  Awaited<ReturnType<typeof orderRepository.findById>>
>;
type FiredTicket = Awaited<ReturnType<typeof orderRepository.fireNewTicket>>;

export async function completeOrderFire(
  auth: AuthContext,
  orderId: string,
  order: FireOrder,
  ticket: FiredTicket,
) {
  const fullOrder = await orderRepository.findById(auth.tenantId, orderId);
  await eventBus.publish(
    { type: "order.updated", payload: toRealtimeOrderPayload(fullOrder) },
    auth.tenantId,
    order.branchId,
  );
  const createdTicket = fullOrder?.kitchenTickets?.find(
    (candidate) => candidate.id === ticket.id,
  );
  if (createdTicket) {
    await eventBus.publish(
      {
        type: "kitchen.ticket.created",
        payload: toRealtimeKitchenTicketPayload(createdTicket),
      },
      auth.tenantId,
      order.branchId,
    );
  }

  try {
    if (createdTicket?.status === "FIRED") {
      await inventoryService.deductForOrderItemsWithRetry(
        auth.tenantId,
        order.branchId,
        orderId,
        ticket.id,
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
    }
  } catch (err) {
    logger.error("order.inventory_deduction_failed", toError(err), {
      orderId,
      branchId: order.branchId,
    });
  }

  return fullOrder;
}
