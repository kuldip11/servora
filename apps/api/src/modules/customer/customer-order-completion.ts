import { createLogger, toError } from "@/core/logger/logger";
import { eventBus } from "@/lib/event-bus";
import { inventoryService } from "@/modules/inventory/inventory.service";
import {
  toRealtimeKitchenTicketPayload,
  toRealtimeOrderPayload,
} from "@/modules/realtime/realtime.mapper";
import { orderRepository } from "@/modules/orders/order.repository";
import { customerPaymentService } from "./customer-payment.service";
import type { persistCustomerOrder } from "./customer-order-persistence";

const logger = createLogger({}, "customer-order");

export const completeCustomerOrder = async (
  state: Awaited<ReturnType<typeof persistCustomerOrder>>,
) => {
  const { session, orderId, createdNewOrder, roundCreated } = state;
  if (session.mode === "TAKEAWAY" && createdNewOrder) {
    await customerPaymentService.initiateTakeawayPayment(
      session.tenantId,
      session.branchId,
      orderId,
    );
  }

  const fullOrder = await orderRepository.findById(session.tenantId, orderId);
  await eventBus.publish(
    {
      type: createdNewOrder ? "order.created" : "order.updated",
      payload: toRealtimeOrderPayload(fullOrder),
    },
    session.tenantId,
    session.branchId,
  );

  const firedTickets = (fullOrder?.kitchenTickets ?? []).filter(
    (ticket) => ticket.status === "FIRED",
  );
  const newestTicket = firedTickets.at(-1);
  if (session.mode !== "TAKEAWAY") {
    if (newestTicket) {
      await eventBus.publish(
        {
          type: "kitchen.ticket.created",
          payload: toRealtimeKitchenTicketPayload(newestTicket),
        },
        session.tenantId,
        session.branchId,
      );
    }
  }

  try {
    if (
      roundCreated &&
      newestTicket &&
      (session.mode !== "TAKEAWAY" || !createdNewOrder)
    )
      await inventoryService.deductForOrderItemsWithRetry(
        session.tenantId,
        session.branchId,
        orderId,
        newestTicket.id,
        newestTicket.items.flatMap((item) =>
          item.menuItemId === null
            ? []
            : [
                {
                  orderItemId: item.id,
                  menuItemId: item.menuItemId,
                  variantId: item.variantId,
                  quantity: item.quantity,
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
        null,
      );
  } catch (err) {
    logger.error("customer_order.inventory_deduction_failed", toError(err), {
      orderId,
      branchId: session.branchId,
    });
  }

  return fullOrder;
};
