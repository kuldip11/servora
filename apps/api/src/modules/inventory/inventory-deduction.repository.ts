import { and, eq, sql } from "drizzle-orm";
import type { InventoryUnit } from "@pos/types";
import { InternalError } from "@/core/errors";
import { db } from "@/db";
import {
  inventoryItems,
  inventoryTransactions,
  kitchenTickets,
  orderInventoryDeductions,
  orders,
} from "@/db/schema";

export const inventoryDeductionRepository = {
  async deductRecipeLines(
    tenantId: string,
    branchId: string,
    orderId: string,
    kitchenTicketId: string,
    lines: Array<{
      inventoryItemId: string;
      menuItemId: string;
      orderItemId: string;
      unit: InventoryUnit;
      neededQuantity: number;
    }>,
    performedBy: string | null,
  ): Promise<{
    deducted: number;
    touchedInventoryItemIds: string[];
    short: Array<{ inventoryItemId: string; name: string }>;
  }> {
    const short: Array<{ inventoryItemId: string; name: string }> = [];
    const touchedInventoryItemIds = new Set<string>();
    let deducted = 0;

    await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${kitchenTicketId}))`,
      );

      const [order] = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.tenantId, tenantId),
            eq(orders.branchId, branchId),
          ),
        );
      if (!order) return;

      const ticket = await tx.query.kitchenTickets.findFirst({
        where: and(
          eq(kitchenTickets.id, kitchenTicketId),
          eq(kitchenTickets.orderId, orderId),
          eq(kitchenTickets.tenantId, tenantId),
          eq(kitchenTickets.branchId, branchId),
        ),
        columns: { id: true },
        with: { items: true },
      });
      if (!ticket) return;

      for (const line of lines) {
        const existing = await tx.query.orderInventoryDeductions.findFirst({
          where: and(
            eq(orderInventoryDeductions.kitchenTicketId, kitchenTicketId),
            line.orderItemId
              ? eq(orderInventoryDeductions.orderItemId, line.orderItemId)
              : eq(orderInventoryDeductions.menuItemId, line.menuItemId),
            eq(orderInventoryDeductions.inventoryItemId, line.inventoryItemId),
          ),
          columns: { id: true },
        });
        if (existing) continue;
        const [invItem] = await tx
          .select()
          .from(inventoryItems)
          .where(
            and(
              eq(inventoryItems.id, line.inventoryItemId),
              eq(inventoryItems.tenantId, tenantId),
              eq(inventoryItems.branchId, branchId),
            ),
          );
        if (!invItem) continue;

        const balanceBefore = parseFloat(invItem.currentStock);
        const wasShort = line.neededQuantity > balanceBefore;
        const balanceAfter = Math.max(0, balanceBefore - line.neededQuantity);
        const actuallyDeducted = balanceBefore - balanceAfter;

        await tx
          .update(inventoryItems)
          .set({ currentStock: balanceAfter.toFixed(3), updatedAt: new Date() })
          .where(eq(inventoryItems.id, line.inventoryItemId));

        await tx.insert(inventoryTransactions).values({
          inventoryItemId: line.inventoryItemId,
          transactionType: "OUT",
          quantity: actuallyDeducted.toFixed(3),
          balanceBefore: balanceBefore.toFixed(3),
          balanceAfter: balanceAfter.toFixed(3),
          notes: `Auto-deducted for order ${orderId}`,
          performedBy,
        });

        const exactTicketItem = ticket.items.find(
          (item) =>
            item.id === line.orderItemId && item.menuItemId === line.menuItemId,
        );
        if (!exactTicketItem) {
          throw new InternalError(
            `Order item ${line.orderItemId} is missing from kitchen ticket ${kitchenTicketId}`,
          );
        }
        await tx.insert(orderInventoryDeductions).values({
          orderId,
          kitchenTicketId,
          orderItemId: exactTicketItem.id,
          menuItemId: line.menuItemId,
          inventoryItemId: line.inventoryItemId,
          quantityDeducted: actuallyDeducted.toFixed(3),
          unit: line.unit,
          wasShort,
        });

        deducted++;
        touchedInventoryItemIds.add(line.inventoryItemId);
        if (
          wasShort &&
          !short.some((s) => s.inventoryItemId === line.inventoryItemId)
        ) {
          short.push({
            inventoryItemId: line.inventoryItemId,
            name: invItem.name,
          });
        }
      }
    });

    return {
      deducted,
      touchedInventoryItemIds: Array.from(touchedInventoryItemIds),
      short,
    };
  },
};
