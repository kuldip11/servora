import type {
  RealtimeKitchenTicketPayload,
  RealtimeOrderPayload,
} from "@pos/contracts";
import { toOrderResponse } from "@/modules/orders/order.mapper";
import type { orderRepository } from "@/modules/orders/order.repository";
import type { ticketRepository } from "@/modules/kitchen-tickets/ticket.repository";
import { toKitchenQueueTicketResponse } from "@/modules/kitchen-tickets/ticket.mapper";

type OrderAggregate = NonNullable<
  Awaited<ReturnType<typeof orderRepository.findById>>
>;
type DetailedTicketAggregate = NonNullable<
  Awaited<ReturnType<typeof ticketRepository.findDetailedById>>
>;
type OrderTicketAggregate = OrderAggregate["kitchenTickets"][number];

interface RealtimeTicketContext {
  customerSessionId?: string | null | undefined;
  order?: Pick<OrderAggregate, "id" | "type" | "tableId" | "table"> | null;
}

export const toRealtimeOrderPayload = (
  order: OrderAggregate | null | undefined,
): RealtimeOrderPayload => ({
  ...toOrderResponse(order),
  ...(order?.customerSessionId
    ? { customerSessionId: order.customerSessionId }
    : {}),
});

export const toRealtimeKitchenTicketPayload = (
  ticket: DetailedTicketAggregate | OrderTicketAggregate,
  context: RealtimeTicketContext = {},
): RealtimeKitchenTicketPayload => {
  const mapped = toKitchenQueueTicketResponse(ticket);
  const relatedOrder = context.order;
  return {
    ...mapped,
    ...(context.customerSessionId
      ? { customerSessionId: context.customerSessionId }
      : {}),
    ...(relatedOrder
      ? {
          order: {
            id: relatedOrder.id,
            type: relatedOrder.type,
            tableId: relatedOrder.tableId,
            table: relatedOrder.table
              ? {
                  id: relatedOrder.table.id,
                  name: relatedOrder.table.name,
                  section: relatedOrder.table.section,
                }
              : null,
          },
        }
      : {}),
  };
};
