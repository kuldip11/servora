import { and, eq, inArray, isNull } from "drizzle-orm";
import { InternalError } from "@/core/errors";
import { db } from "@/db";
import {
  inventoryItems,
  inventoryTransactions,
  orderInventoryDeductions,
  orderItems,
  orders,
} from "@/db/schema";
import { resolveInventoryReversal } from "@/modules/inventory/inventory-stock";
import {
  assertAndReplacePromotionRedemptions,
  type PendingPromotionRedemption,
} from "@/modules/menu/promotions/promotion.repository";
import type { PricedLine } from "./pricing/pricing.types";

export const orderAdjustmentRepository = {
  async voidItem(
    tenantId: string,
    orderId: string,
    orderItemId: string,
    voidedBy: string,
    reason: string,
    cancellationReasonId: string | undefined,
    totals: {
      subtotal: number;
      discountAmount: number;
      taxAmount: number;
      serviceChargeAmount: number;
      roundingAdjustment: number;
      totalAmount: number;
      existingPricingUpdates?: Array<{
        id: string;
        pricingAttribution: PricedLine["pricingAttribution"];
        taxMode: "INCLUSIVE" | "EXCLUSIVE";
      }>;
      promotionRedemptions?: PendingPromotionRedemption[];
    },
  ) {
    return db.transaction(async (tx) => {
      const target = await tx.query.orderItems.findFirst({
        where: and(
          eq(orderItems.id, orderItemId),
          eq(orderItems.orderId, orderId),
        ),
      });
      if (!target || target.itemStatus !== "ACTIVE") return undefined;

      const activeIds = target.comboGroupId
        ? (
            await tx.query.orderItems.findMany({
              where: and(
                eq(orderItems.orderId, orderId),
                eq(orderItems.comboGroupId, target.comboGroupId),
                eq(orderItems.itemStatus, "ACTIVE"),
              ),
              columns: { id: true },
            })
          ).map((item) => item.id)
        : [orderItemId];

      if (!activeIds.length) return undefined;

      const voidedItems = await tx
        .update(orderItems)
        .set({
          itemStatus: "VOIDED",
          voidedReason: reason,
          voidedReasonId: cancellationReasonId ?? null,
          voidedBy,
          voidedAt: new Date(),
        })
        .where(
          and(
            eq(orderItems.orderId, orderId),
            inArray(orderItems.id, activeIds),
            eq(orderItems.itemStatus, "ACTIVE"),
          ),
        )
        .returning();
      const voided = voidedItems.find((item) => item.id === orderItemId);
      if (!voided) return undefined;

      for (const update of totals.existingPricingUpdates ?? []) {
        await tx
          .update(orderItems)
          .set({
            pricingAttribution: update.pricingAttribution,
            taxMode: update.taxMode,
          })
          .where(
            and(
              eq(orderItems.id, update.id),
              eq(orderItems.orderId, orderId),
              inArray(orderItems.itemStatus, ["ACTIVE", "REFIRED"]),
            ),
          );
      }
      await assertAndReplacePromotionRedemptions(
        tx,
        tenantId,
        orderId,
        totals.promotionRedemptions ?? [],
      );

      await tx
        .update(orders)
        .set({
          subtotal: totals.subtotal.toFixed(2),
          discountAmount: totals.discountAmount.toFixed(2),
          taxAmount: totals.taxAmount.toFixed(2),
          serviceChargeAmount: totals.serviceChargeAmount.toFixed(2),
          roundingAdjustment: totals.roundingAdjustment.toFixed(2),
          totalAmount: totals.totalAmount.toFixed(2),
          updatedAt: new Date(),
        })
        .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)));

      const deductions = await tx.query.orderInventoryDeductions.findMany({
        where: and(
          inArray(orderInventoryDeductions.orderItemId, activeIds),
          isNull(orderInventoryDeductions.reversedAt),
        ),
      });
      const reversedInventoryItemIds: string[] = [];
      for (const deduction of deductions) {
        const inventoryItem = await tx.query.inventoryItems.findFirst({
          where: and(
            eq(inventoryItems.id, deduction.inventoryItemId),
            eq(inventoryItems.tenantId, tenantId),
          ),
        });
        if (!inventoryItem)
          throw new InternalError(
            `Inventory item ${deduction.inventoryItemId} is missing for an unreversed deduction`,
          );
        const balanceBefore = Number(inventoryItem.currentStock);
        const quantity = Number(deduction.quantityDeducted);
        const { balanceAfter } = resolveInventoryReversal(
          balanceBefore,
          quantity,
        );
        await tx
          .update(inventoryItems)
          .set({ currentStock: balanceAfter.toFixed(3), updatedAt: new Date() })
          .where(eq(inventoryItems.id, inventoryItem.id));
        await tx.insert(inventoryTransactions).values({
          inventoryItemId: inventoryItem.id,
          transactionType: "IN",
          quantity: quantity.toFixed(3),
          balanceBefore: balanceBefore.toFixed(3),
          balanceAfter: balanceAfter.toFixed(3),
          notes: `Reversal for voided order item ${deduction.orderItemId ?? orderItemId}`,
          performedBy: voidedBy,
          reversalOfDeductionId: deduction.id,
        });
        await tx
          .update(orderInventoryDeductions)
          .set({ reversedAt: new Date() })
          .where(
            and(
              eq(orderInventoryDeductions.id, deduction.id),
              isNull(orderInventoryDeductions.reversedAt),
            ),
          );
        reversedInventoryItemIds.push(inventoryItem.id);
      }
      return { voided, voidedItemIds: activeIds, reversedInventoryItemIds };
    });
  },

  async compItem(
    tenantId: string,
    orderId: string,
    orderItemId: string,
    compedBy: string,
    reason: string,
    cancellationReasonId: string | undefined,
    totals: {
      subtotal: number;
      discountAmount: number;
      taxAmount: number;
      serviceChargeAmount: number;
      roundingAdjustment: number;
      totalAmount: number;
      existingPricingUpdates?: Array<{
        id: string;
        pricingAttribution: PricedLine["pricingAttribution"];
        taxMode: "INCLUSIVE" | "EXCLUSIVE";
      }>;
      promotionRedemptions?: PendingPromotionRedemption[];
    },
  ) {
    return db.transaction(async (tx) => {
      const target = await tx.query.orderItems.findFirst({
        where: and(
          eq(orderItems.id, orderItemId),
          eq(orderItems.orderId, orderId),
        ),
      });
      if (!target || target.itemStatus !== "ACTIVE") return undefined;

      const activeIds = target.comboGroupId
        ? (
            await tx.query.orderItems.findMany({
              where: and(
                eq(orderItems.orderId, orderId),
                eq(orderItems.comboGroupId, target.comboGroupId),
                eq(orderItems.itemStatus, "ACTIVE"),
              ),
              columns: { id: true },
            })
          ).map((item) => item.id)
        : [orderItemId];

      if (!activeIds.length) return undefined;

      const compedItems = await tx
        .update(orderItems)
        .set({
          itemStatus: "COMPED",
          compedReason: reason,
          compedReasonId: cancellationReasonId ?? null,
          compedBy,
          compedAt: new Date(),
        })
        .where(
          and(
            eq(orderItems.orderId, orderId),
            inArray(orderItems.id, activeIds),
            eq(orderItems.itemStatus, "ACTIVE"),
          ),
        )
        .returning();
      const comped = compedItems.find((item) => item.id === orderItemId);
      if (!comped) return undefined;

      for (const update of totals.existingPricingUpdates ?? []) {
        await tx
          .update(orderItems)
          .set({
            pricingAttribution: update.pricingAttribution,
            taxMode: update.taxMode,
          })
          .where(
            and(
              eq(orderItems.id, update.id),
              eq(orderItems.orderId, orderId),
              inArray(orderItems.itemStatus, ["ACTIVE", "REFIRED"]),
            ),
          );
      }
      await assertAndReplacePromotionRedemptions(
        tx,
        tenantId,
        orderId,
        totals.promotionRedemptions ?? [],
      );

      await tx
        .update(orders)
        .set({
          subtotal: totals.subtotal.toFixed(2),
          discountAmount: totals.discountAmount.toFixed(2),
          taxAmount: totals.taxAmount.toFixed(2),
          serviceChargeAmount: totals.serviceChargeAmount.toFixed(2),
          roundingAdjustment: totals.roundingAdjustment.toFixed(2),
          totalAmount: totals.totalAmount.toFixed(2),
          updatedAt: new Date(),
        })
        .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)));
      return { comped, compedItemIds: activeIds };
    });
  },
};
