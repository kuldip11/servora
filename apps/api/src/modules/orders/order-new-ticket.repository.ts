import { and, eq, gte, inArray, sql } from "drizzle-orm";
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
} from "@/db/schema";
import { compact } from "@/lib/object-utils";
import {
  assertAndInsertPromotionRedemptions,
  assertAndReplacePromotionRedemptions,
  type PendingPromotionRedemption,
} from "@/modules/menu/promotions/promotion.repository";
import type { PricedLine } from "./pricing/pricing.types";

export const orderNewTicketRepository = {
  async fireNewTicket(
    tenantId: string,
    branchId: string,
    orderId: string,
    items: PricedLine[],
    extraSubtotal: number,
    extraTax: number,
    notes?: string | undefined,
    customerRequestId?: string | null,
    pricingAdjustments?: {
      discountAmount?: number;
      promotionRedemptions?: PendingPromotionRedemption[];
      serviceChargeAmount?: number;
      roundingAdjustment?: number;
      totalAmount?: number;
      existingPricingUpdates?: Array<{
        id: string;
        pricingAttribution: PricedLine["pricingAttribution"];
        taxMode: "INCLUSIVE" | "EXCLUSIVE";
      }>;
      absoluteTotals?: {
        subtotal: number;
        taxAmount: number;
        discountAmount: number;
        serviceChargeAmount: number;
        roundingAdjustment: number;
        totalAmount: number;
      };
      replacePromotionRedemptions?: boolean;
      customerId?: string | null;
    },
    course?: {
      number: number;
      name?: string | undefined;
      status: "FIRED" | "HELD";
    },
  ) {
    return db.transaction(async (tx) => {
      if (customerRequestId) {
        const existingTicket = await tx.query.kitchenTickets.findFirst({
          where: and(
            eq(kitchenTickets.orderId, orderId),
            eq(kitchenTickets.customerRequestId, customerRequestId),
          ),
        });
        if (existingTicket) return existingTicket;
      }

      const stockNeeds = new Map<
        string,
        { menuItemId: string; variantId?: string; quantity: number }
      >();
      for (const line of items) {
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
              eq(menuItems.tenantId, tenantId),
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
                  eq(menuItems.tenantId, tenantId),
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

      const [{ maxTicket } = { maxTicket: 0 }] = await tx
        .select({
          maxTicket: sql<number>`coalesce(max(${kitchenTickets.ticketNumber}), 0)`,
        })
        .from(kitchenTickets)
        .where(eq(kitchenTickets.orderId, orderId));

      let courseId: string | null = null;
      if (course) {
        let row = await tx.query.orderCourses.findFirst({
          where: and(
            eq(orderCourses.orderId, orderId),
            eq(orderCourses.courseNumber, course.number),
          ),
        });
        if (!row) {
          [row] = await tx
            .insert(orderCourses)
            .values({
              orderId,
              courseNumber: course.number,
              name: course.name ?? `Course ${course.number}`,
            })
            .returning();
        }
        courseId = row!.id;
      }

      const status = course?.status ?? "FIRED";
      const [ticket] = await tx
        .insert(kitchenTickets)
        .values(
          compact({
            tenantId,
            branchId,
            orderId,
            ticketNumber: (maxTicket ?? 0) + 1,
            notes,
            customerRequestId: customerRequestId ?? null,
            courseId,
            status,
            firedAt: status === "HELD" ? null : undefined,
          }) as typeof kitchenTickets.$inferInsert,
        )
        .returning();

      const insertedItems = await tx
        .insert(orderItems)
        .values(
          items.map((item) =>
            compact({
              orderId,
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
              billingExcluded: item.billingExcluded ?? false,
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
      for (const [idx, item] of items.entries())
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

      const extraDiscount = pricingAdjustments?.discountAmount ?? 0;
      const extraServiceCharge = pricingAdjustments?.serviceChargeAmount ?? 0;
      for (const update of pricingAdjustments?.existingPricingUpdates ?? []) {
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
      if (pricingAdjustments?.replacePromotionRedemptions) {
        await assertAndReplacePromotionRedemptions(
          tx,
          tenantId,
          orderId,
          pricingAdjustments.promotionRedemptions ?? [],
        );
      } else {
        await assertAndInsertPromotionRedemptions(
          tx,
          tenantId,
          orderId,
          pricingAdjustments?.promotionRedemptions ?? [],
        );
      }
      const absolute = pricingAdjustments?.absoluteTotals;
      await tx
        .update(orders)
        .set({
          subtotal: absolute
            ? absolute.subtotal.toFixed(2)
            : sql`${orders.subtotal} + ${extraSubtotal.toFixed(2)}`,
          taxAmount: absolute
            ? absolute.taxAmount.toFixed(2)
            : sql`${orders.taxAmount} + ${extraTax.toFixed(2)}`,
          discountAmount: absolute
            ? absolute.discountAmount.toFixed(2)
            : sql`${orders.discountAmount} + ${extraDiscount.toFixed(2)}`,
          serviceChargeAmount: absolute
            ? absolute.serviceChargeAmount.toFixed(2)
            : sql`${orders.serviceChargeAmount} + ${extraServiceCharge.toFixed(2)}`,
          ...(absolute
            ? { roundingAdjustment: absolute.roundingAdjustment.toFixed(2) }
            : pricingAdjustments?.roundingAdjustment !== undefined
              ? {
                  roundingAdjustment:
                    pricingAdjustments.roundingAdjustment.toFixed(2),
                }
              : {}),
          totalAmount: absolute
            ? absolute.totalAmount.toFixed(2)
            : pricingAdjustments?.totalAmount === undefined
              ? sql`${orders.totalAmount} + ${(extraSubtotal - extraDiscount + extraTax + extraServiceCharge).toFixed(2)}`
              : pricingAdjustments.totalAmount.toFixed(2),
          ...(pricingAdjustments?.customerId !== undefined
            ? { customerId: pricingAdjustments.customerId }
            : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.tenantId, tenantId),
            eq(orders.branchId, branchId),
          ),
        );
      return ticket!;
    });
  },
};
