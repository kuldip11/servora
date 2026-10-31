import { and, eq, gte, sql } from "drizzle-orm";
import type { OrderType } from "@pos/types";
import { DomainRuleError } from "@/core/errors";
import { db } from "@/db";
import {
  kitchenTickets,
  menuItems,
  menuItemVariants,
  orderCourses,
  orderItemModifiers,
  orderItems,
  orders,
  orderStatusHistory,
} from "@/db/schema";
import { compact } from "@/lib/object-utils";
import {
  assertAndInsertPromotionRedemptions,
  type PendingPromotionRedemption,
} from "@/modules/menu/promotions/promotion.repository";
import type { PricedLine } from "./pricing/pricing.types";

export const orderCreateRepository = {
  async create(data: {
    tenantId: string;
    branchId: string;
    tableId?: string | undefined;
    createdBy?: string | null;
    source?: "STAFF" | "CUSTOMER_QR";
    customerSessionId?: string | null;
    customerId?: string | null;
    customerGroupId?: string | null;
    type: OrderType;
    billingMode?: "LINE_ITEMS" | "PER_COVER";
    coverCount?: number | null;
    perCoverPriceRuleId?: string | null;
    perCoverRate?: number | null;
    notes?: string | undefined;
    items: PricedLine[];
    subtotal: number;
    taxAmount: number;
    discountAmount?: number;
    serviceChargeAmount?: number;
    roundingAdjustment?: number;
    totalAmount: number;
    promotionRedemptions?: PendingPromotionRedemption[];
    initialTicketStatus?: "PENDING_PAYMENT" | "FIRED";
    customerRequestId?: string | null;
    resolutionAsOf?: Date;
  }) {
    return db.transaction(async (tx) => {
      const stockNeeds = new Map<
        string,
        { menuItemId: string; variantId?: string; quantity: number }
      >();
      for (const line of data.items) {
        if (!line.menuItemId) continue;
        const key = `${line.menuItemId}:${line.variantId ?? ""}`;
        const current = stockNeeds.get(key);
        if (current) current.quantity += line.quantity;
        else
          stockNeeds.set(key, {
            menuItemId: line.menuItemId,
            ...(line.variantId ? { variantId: line.variantId } : {}),
            quantity: line.quantity,
          });
      }
      for (const need of stockNeeds.values()) {
        let handledByVariant = false;
        if (need.variantId) {
          const variant = await tx.query.menuItemVariants.findFirst({
            where: and(
              eq(menuItemVariants.id, need.variantId),
              eq(menuItemVariants.menuItemId, need.menuItemId),
            ),
            columns: { manualStockCount: true },
          });
          if (variant?.manualStockCount != null) {
            handledByVariant = true;
            const [updated] = await tx
              .update(menuItemVariants)
              .set({
                manualStockCount: sql`${menuItemVariants.manualStockCount} - ${need.quantity}`,
                manualStockCountUpdatedAt: new Date(),
              })
              .where(
                and(
                  eq(menuItemVariants.id, need.variantId),
                  eq(menuItemVariants.menuItemId, need.menuItemId),
                  gte(menuItemVariants.manualStockCount, need.quantity),
                ),
              )
              .returning({ id: menuItemVariants.id });
            if (!updated)
              throw new DomainRuleError(
                "Manual stock was depleted concurrently",
                { reason: "MANUAL_STOCK_DEPLETED" },
              );
          }
        }
        if (!handledByVariant) {
          const item = await tx.query.menuItems.findFirst({
            where: and(
              eq(menuItems.id, need.menuItemId),
              eq(menuItems.tenantId, data.tenantId),
            ),
            columns: { manualStockCount: true },
          });
          if (item?.manualStockCount != null) {
            const [updated] = await tx
              .update(menuItems)
              .set({
                manualStockCount: sql`${menuItems.manualStockCount} - ${need.quantity}`,
                manualStockCountUpdatedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(menuItems.id, need.menuItemId),
                  eq(menuItems.tenantId, data.tenantId),
                  gte(menuItems.manualStockCount, need.quantity),
                ),
              )
              .returning({ id: menuItems.id });
            if (!updated)
              throw new DomainRuleError(
                "Manual stock was depleted concurrently",
                { reason: "MANUAL_STOCK_DEPLETED" },
              );
          }
        }
      }

      const [order] = await tx
        .insert(orders)
        .values(
          compact({
            tenantId: data.tenantId,
            branchId: data.branchId,
            tableId: data.tableId,
            createdBy: data.createdBy ?? null,
            source: data.source ?? "STAFF",
            customerSessionId: data.customerSessionId ?? null,
            customerId: data.customerId ?? null,
            customerGroupId: data.customerGroupId ?? null,
            type: data.type,
            billingMode: data.billingMode ?? "LINE_ITEMS",
            coverCount: data.coverCount ?? null,
            perCoverPriceRuleId: data.perCoverPriceRuleId ?? null,
            perCoverRate:
              data.perCoverRate == null ? null : data.perCoverRate.toFixed(2),
            notes: data.notes,
            resolutionAsOf: data.resolutionAsOf ?? null,
            subtotal: data.subtotal.toFixed(2),
            taxAmount: data.taxAmount.toFixed(2),
            discountAmount: (data.discountAmount ?? 0).toFixed(2),
            serviceChargeAmount: (data.serviceChargeAmount ?? 0).toFixed(2),
            roundingAdjustment: (data.roundingAdjustment ?? 0).toFixed(2),
            totalAmount: data.totalAmount.toFixed(2),
          }) as typeof orders.$inferInsert,
        )
        .returning();

      const explicitCourseMode = data.items.some(
        (item) => item.courseNumber !== undefined,
      );
      const grouped = new Map<number, PricedLine[]>();
      for (const item of data.items) {
        const courseNumber = item.courseNumber ?? 1;
        const bucket = grouped.get(courseNumber) ?? [];
        bucket.push(item);
        grouped.set(courseNumber, bucket);
      }
      const courseNumbers = [...grouped.keys()].sort((a, b) => a - b);
      let ticketNumber = 0;

      for (const courseNumber of courseNumbers) {
        ticketNumber += 1;
        let courseId: string | null = null;
        if (explicitCourseMode) {
          const [course] = await tx
            .insert(orderCourses)
            .values({
              orderId: order!.id,
              courseNumber,
              name: `Course ${courseNumber}`,
            })
            .returning();
          courseId = course!.id;
        }
        const status =
          data.initialTicketStatus ??
          (explicitCourseMode && courseNumber > 1 ? "HELD" : "FIRED");
        const [ticket] = await tx
          .insert(kitchenTickets)
          .values(
            compact({
              tenantId: data.tenantId,
              branchId: data.branchId,
              orderId: order!.id,
              ticketNumber,
              courseId,
              notes: data.notes,
              status,
              firedAt: status === "HELD" ? null : undefined,
              customerRequestId:
                ticketNumber === 1 ? (data.customerRequestId ?? null) : null,
            }) as typeof kitchenTickets.$inferInsert,
          )
          .returning();

        const groupItems = grouped.get(courseNumber)!;
        const insertedItems = await tx
          .insert(orderItems)
          .values(
            groupItems.map((item) =>
              compact({
                orderId: order!.id,
                kitchenTicketId: ticket!.id,
                menuItemId: item.menuItemId,
                menuItemName: item.menuItemName,
                comboId: item.comboId ?? null,
                comboGroupId: item.comboGroupId ?? null,
                comboSlotOptionId: item.comboSlotOptionId ?? null,
                variantId: item.variantId,
                variantName: item.variantName,
                quantity: item.quantity,
                weightQuantity:
                  item.weightQuantity == null
                    ? null
                    : String(item.weightQuantity),
                weightUnit: item.weightUnit ?? null,
                manualPrice:
                  item.manualPrice == null ? null : item.manualPrice.toFixed(2),
                billingExcluded:
                  data.billingMode === "PER_COVER"
                    ? true
                    : (item.billingExcluded ?? false),
                unitPrice: item.unitPrice.toFixed(2),
                subtotal: item.subtotal.toFixed(2),
                taxRate: item.taxRate.toFixed(2),
                taxMode: item.taxMode ?? "EXCLUSIVE",
                pricingAttribution: item.pricingAttribution,
                chefNotes: item.chefNotes,
                seatLabel: item.seatLabel,
                fulfillmentType: item.fulfillmentType,
                stationId: item.stationId ?? null,
                menuChangeEventId: item.menuChangeEventId ?? null,
                resolutionAsOf: item.resolutionAsOf ?? null,
                pricingReplayEvidence: item.pricingReplayEvidence ?? null,
                availabilityReplayEvidence:
                  item.availabilityReplayEvidence ?? null,
                availabilitySnapshot: item.availabilitySnapshot ?? null,
              }),
            ) as (typeof orderItems.$inferInsert)[],
          )
          .returning();

        for (const [idx, item] of groupItems.entries()) {
          if (item.modifiers?.length) {
            await tx.insert(orderItemModifiers).values(
              item.modifiers.map((mod) => ({
                orderItemId: insertedItems[idx]!.id,
                modifierId: mod.modifierId,
                modifierGroupName: mod.modifierGroupName,
                name: mod.name,
                price: mod.price.toFixed(2),
                quantity: mod.quantity ?? 1,
                zoneLabel: mod.zoneLabel ?? null,
              })),
            );
          }
        }
      }

      await assertAndInsertPromotionRedemptions(
        tx,
        data.tenantId,
        order!.id,
        data.promotionRedemptions ?? [],
      );
      await tx.insert(orderStatusHistory).values({
        orderId: order!.id,
        newStatus: "OPEN",
        changedBy: data.createdBy ?? null,
      });
      return order!;
    });
  },
};
