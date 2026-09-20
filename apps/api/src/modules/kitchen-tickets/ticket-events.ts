import type { KitchenTicket } from "@pos/types";
import type { AuthContext } from "@/core/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { eventBus } from "@/lib/event-bus";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { ticketRepository } from "./ticket.repository";
import { ticketNotFound } from "./ticket.errors";

export const publishDetailedTicket = async (
  auth: AuthContext,
  ticketId: string,
  type: "kitchen.ticket.created" | "kitchen.ticket.updated",
) => {
  const detailed = await ticketRepository.findDetailedById(
    auth.tenantId,
    ticketId,
  );
  if (!detailed) throw ticketNotFound(ticketId);
  const parentOrder = await db.query.orders.findFirst({
    where: and(
      eq(orders.id, detailed.orderId),
      eq(orders.tenantId, auth.tenantId),
    ),
    columns: { customerSessionId: true },
  });
  const payload = {
    ...(detailed as unknown as KitchenTicket),
    ...(parentOrder?.customerSessionId
      ? { customerSessionId: parentOrder.customerSessionId }
      : {}),
  };
  await eventBus.publish({ type, payload }, auth.tenantId, detailed.branchId, {
    userId: auth.userId,
    requestId: auth.requestId,
    ipAddress: auth.ipAddress,
  });
  return detailed;
};

export const deductTicketWhenFired = async (
  auth: AuthContext,
  ticket: Awaited<ReturnType<typeof ticketRepository.findDetailedById>>,
) => {
  if (!ticket) return;
  await inventoryService.deductForOrderItemsWithRetry(
    auth.tenantId,
    ticket.branchId,
    ticket.orderId,
    ticket.id,
    ticket.items.flatMap((item) =>
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
    auth.userId,
  );
};
