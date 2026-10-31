import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  kitchenTickets,
  orderItemModifiers,
  orderItems,
  orders,
} from "@/db/schema";
import { compact } from "@/lib/object-utils";
import {
  assertAndReplacePromotionRedemptions,
  type PendingPromotionRedemption,
} from "@/modules/menu/promotions/promotion.repository";
import type { PricedLine } from "./pricing/pricing.types";

export const orderRefireRepository = {
  async refireItem(data: {
    tenantId: string;
    branchId: string;
    orderId: string;
    originalItemId: string;
    item: PricedLine;
    changedBy: string;
    reason: string;
    compOriginal: boolean;
    claimOriginal?: boolean;
    refireType?: "REFIRE" | "REFILL";
    forceBillingExcluded?: boolean;
    absoluteTotals: {
      subtotal: number;
      taxAmount: number;
      discountAmount: number;
      serviceChargeAmount: number;
      roundingAdjustment: number;
      totalAmount: number;
    };
    existingPricingUpdates?: Array<{
      id: string;
      pricingAttribution: PricedLine["pricingAttribution"];
      taxMode: "INCLUSIVE" | "EXCLUSIVE";
    }>;
    promotionRedemptions?: PendingPromotionRedemption[];
  }) {
    return db.transaction(async (tx) => {
      let sourceAvailable = false;
      if (data.claimOriginal === false) {
        const source = await tx.query.orderItems.findFirst({
          where: and(
            eq(orderItems.id, data.originalItemId),
            eq(orderItems.orderId, data.orderId),
            eq(orderItems.itemStatus, "ACTIVE"),
          ),
          columns: { id: true },
        });
        sourceAvailable = Boolean(source);
      } else {
        const [claimedOriginal] = await tx
          .update(orderItems)
          .set({
            itemStatus: "REFIRED",
            refireReason: data.reason,
            refireType: data.refireType ?? "REFIRE",
            refiredBy: data.changedBy,
            refiredAt: new Date(),
            ...(data.compOriginal
              ? {
                  compedReason: `Refire: ${data.reason}`,
                  compedBy: data.changedBy,
                  compedAt: new Date(),
                }
              : {}),
          })
          .where(
            and(
              eq(orderItems.id, data.originalItemId),
              eq(orderItems.orderId, data.orderId),
              eq(orderItems.itemStatus, "ACTIVE"),
            ),
          )
          .returning();
        sourceAvailable = Boolean(claimedOriginal);
      }
      if (!sourceAvailable) return null;

      const [{ maxTicket } = { maxTicket: 0 }] = await tx
        .select({
          maxTicket: sql<number>`coalesce(max(${kitchenTickets.ticketNumber}), 0)`,
        })
        .from(kitchenTickets)
        .where(eq(kitchenTickets.orderId, data.orderId));
      const [ticket] = await tx
        .insert(kitchenTickets)
        .values({
          tenantId: data.tenantId,
          branchId: data.branchId,
          orderId: data.orderId,
          ticketNumber: (maxTicket ?? 0) + 1,
          status: "FIRED",
          firedAt: new Date(),
        })
        .returning();
      const line = data.item;
      const [replacement] = await tx
        .insert(orderItems)
        .values(
          compact({
            orderId: data.orderId,
            kitchenTicketId: ticket!.id,
            menuItemId: line.menuItemId,
            menuItemName: line.menuItemName,
            comboId: line.comboId ?? null,
            comboGroupId: line.comboGroupId ?? null,
            comboSlotOptionId: line.comboSlotOptionId ?? null,
            variantId: line.variantId,
            variantName: line.variantName,
            quantity: line.quantity,
            weightQuantity:
              line.weightQuantity == null ? null : String(line.weightQuantity),
            weightUnit: line.weightUnit ?? null,
            manualPrice:
              line.manualPrice == null ? null : line.manualPrice.toFixed(2),
            billingExcluded:
              data.forceBillingExcluded ?? line.billingExcluded ?? false,
            unitPrice: line.unitPrice.toFixed(2),
            subtotal: line.subtotal.toFixed(2),
            taxRate: line.taxRate.toFixed(2),
            taxMode: line.taxMode ?? "EXCLUSIVE",
            pricingAttribution: line.pricingAttribution,
            chefNotes: line.chefNotes,
            seatLabel: line.seatLabel,
            fulfillmentType: line.fulfillmentType,
            stationId: line.stationId ?? null,
            menuChangeEventId: line.menuChangeEventId ?? null,
            resolutionAsOf: line.resolutionAsOf ?? null,
            pricingReplayEvidence: line.pricingReplayEvidence ?? null,
            availabilityReplayEvidence: line.availabilityReplayEvidence ?? null,
            availabilitySnapshot: line.availabilitySnapshot ?? null,
            refiresOrderItemId: data.originalItemId,
            refireReason: data.reason,
            refireType: data.refireType ?? "REFIRE",
            refiredBy: data.changedBy,
            refiredAt: new Date(),
          }) as typeof orderItems.$inferInsert,
        )
        .returning();
      if (line.modifiers.length)
        await tx.insert(orderItemModifiers).values(
          line.modifiers.map((mod) => ({
            orderItemId: replacement!.id,
            modifierId: mod.modifierId,
            modifierGroupName: mod.modifierGroupName,
            name: mod.name,
            price: mod.price.toFixed(2),
            quantity: mod.quantity,
            zoneLabel: mod.zoneLabel ?? null,
          })),
        );
      for (const update of data.existingPricingUpdates ?? []) {
        await tx
          .update(orderItems)
          .set({
            pricingAttribution: update.pricingAttribution,
            taxMode: update.taxMode,
          })
          .where(
            and(
              eq(orderItems.id, update.id),
              eq(orderItems.orderId, data.orderId),
              inArray(orderItems.itemStatus, ["ACTIVE", "REFIRED"]),
            ),
          );
      }
      await assertAndReplacePromotionRedemptions(
        tx,
        data.tenantId,
        data.orderId,
        data.promotionRedemptions ?? [],
      );
      await tx
        .update(orders)
        .set({
          subtotal: data.absoluteTotals.subtotal.toFixed(2),
          taxAmount: data.absoluteTotals.taxAmount.toFixed(2),
          discountAmount: data.absoluteTotals.discountAmount.toFixed(2),
          serviceChargeAmount:
            data.absoluteTotals.serviceChargeAmount.toFixed(2),
          roundingAdjustment: data.absoluteTotals.roundingAdjustment.toFixed(2),
          totalAmount: data.absoluteTotals.totalAmount.toFixed(2),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(orders.id, data.orderId),
            eq(orders.tenantId, data.tenantId),
            eq(orders.branchId, data.branchId),
          ),
        );
      return { ticket: ticket!, replacement: replacement! };
    });
  },
};
