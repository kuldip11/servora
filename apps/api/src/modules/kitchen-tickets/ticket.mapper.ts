import type { KitchenQueueTicketResponse } from "@pos/contracts";
import type { ticketRepository } from "./ticket.repository";

type QueueTicket = Awaited<
  ReturnType<typeof ticketRepository.getQueue>
>[number];
type DetailedTicket = NonNullable<
  Awaited<ReturnType<typeof ticketRepository.findDetailedById>>
>;
type TicketAggregate = QueueTicket | DetailedTicket;

const numberOrNull = (
  value: string | number | null | undefined,
): number | null => (value == null ? null : Number(value));
const isoOrNull = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null;

export const toKitchenQueueTicketResponse = (
  ticket: TicketAggregate,
): KitchenQueueTicketResponse => ({
  id: ticket.id,
  tenantId: ticket.tenantId,
  branchId: ticket.branchId,
  orderId: ticket.orderId,
  ...(ticket.order
    ? {
        order: {
          id: ticket.order.id,
          type: ticket.order.type,
          tableId: ticket.order.tableId,
          table: ticket.order.table
            ? {
                id: ticket.order.table.id,
                name: ticket.order.table.name,
                section: ticket.order.table.section,
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
});
