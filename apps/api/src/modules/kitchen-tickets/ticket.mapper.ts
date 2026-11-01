import type { KitchenQueueTicketResponse } from "@pos/contracts";
import type { ticketRepository } from "./ticket.repository";
import type { orderRepository } from "@/modules/orders/order.repository";

type QueueTicket = Awaited<
  ReturnType<typeof ticketRepository.getQueue>
>[number];
type DetailedTicket = NonNullable<
  Awaited<ReturnType<typeof ticketRepository.findDetailedById>>
>;
type OrderTicket = NonNullable<
  Awaited<ReturnType<typeof orderRepository.findById>>
>["kitchenTickets"][number];
type TicketAggregate = QueueTicket | DetailedTicket | OrderTicket;

const numberOrNull = (
  value: string | number | null | undefined,
): number | null => (value == null ? null : Number(value));
const isoOrNull = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null;

export const toKitchenQueueTicketResponse = (
  ticket: TicketAggregate,
): KitchenQueueTicketResponse => {
  const order = "order" in ticket ? ticket.order : undefined;
  return {
    id: ticket.id,
    tenantId: ticket.tenantId,
    branchId: ticket.branchId,
    orderId: ticket.orderId,
    ...(order
      ? {
          order: {
            id: order.id,
            type: order.type,
            tableId: order.tableId,
            table: order.table
              ? {
                  id: order.table.id,
                  name: order.table.name,
                  section: order.table.section,
                }
              : null,
          },
        }
      : {}),
    ticketNumber: ticket.ticketNumber,
    status: ticket.status,
    courseId: ticket.courseId,
    course: ticket.course
      ? {
          id: ticket.course.id,
          orderId: ticket.course.orderId,
          courseNumber: ticket.course.courseNumber,
          name: ticket.course.name,
          createdAt: ticket.course.createdAt.toISOString(),
          updatedAt: ticket.course.updatedAt.toISOString(),
        }
      : null,
    notes: ticket.notes,
    items: ticket.items.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      menuItemId: item.menuItemId,
      menuItemName: item.menuItemName,
      variantId: item.variantId,
      variantName: item.variantName,
      quantity: item.quantity,
      weightQuantity: numberOrNull(item.weightQuantity),
      weightUnit: item.weightUnit,
      comboGroupId: item.comboGroupId,
      chefNotes: item.chefNotes,
      fulfillmentType: item.fulfillmentType,
      stationId: item.stationId,
      itemStatus: item.itemStatus,
      refiresOrderItemId: item.refiresOrderItemId,
      refireReason: item.refireReason,
      refireType: item.refireType,
      modifiers: item.modifiers.map((modifier) => ({
        modifierId: modifier.modifierId,
        modifierGroupName: modifier.modifierGroupName,
        name: modifier.name,
        price: Number(modifier.price),
        quantity: modifier.quantity,
        zoneLabel: modifier.zoneLabel,
      })),
    })),
    firedAt: isoOrNull(ticket.firedAt),
    readyAt: isoOrNull(ticket.readyAt),
    servedAt: isoOrNull(ticket.servedAt),
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
};
