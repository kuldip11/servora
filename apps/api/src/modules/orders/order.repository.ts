import {
  eq,
  and,
  desc,
  asc,
  sql,
  inArray,
  gte,
  isNull,
  exists,
  count,
} from "drizzle-orm";
import type { OrderStatus, OrderType } from "@pos/types";
import { db } from "@/db";
import { DomainRuleError } from "@/core/errors";
import {
  orders,
  orderItems,
  orderStatusHistory,
  orderItemModifiers,
  kitchenTickets,
  orderCourses,
  orderInventoryDeductions,
  inventoryItems,
  inventoryTransactions,
  menuItems,
  menuItemVariants,
  restaurantTables,
} from "@/db/schema";
import type { PricedLine } from "./pricing/pricing.types";
import { compact } from "@/lib/object-utils";
import { resolveInventoryReversal } from "@/modules/inventory/inventory-stock";
import {
  assertAndInsertPromotionRedemptions,
  assertAndReplacePromotionRedemptions,
  type PendingPromotionRedemption,
} from "@/modules/menu/promotions/promotion.repository";

export const orderRepository = {
  async mergeOrders(data: {
    tenantId: string;
    branchId: string;
    sourceOrderId: string;
    targetOrderId: string;
  }) {
    return db.transaction(async (tx) => {
      const source = await tx.query.orders.findFirst({
        where: and(
          eq(orders.id, data.sourceOrderId),
          eq(orders.tenantId, data.tenantId),
          eq(orders.branchId, data.branchId),
        ),
      });
      const target = await tx.query.orders.findFirst({
        where: and(
          eq(orders.id, data.targetOrderId),
          eq(orders.tenantId, data.tenantId),
          eq(orders.branchId, data.branchId),
        ),
      });
      if (!source || !target) return { status: "not_found" as const };
      if (source.id === target.id) return { status: "same_order" as const };
      if (
        !["OPEN", "BILL_REQUESTED"].includes(source.status) ||
        !["OPEN", "BILL_REQUESTED"].includes(target.status)
      )
        return { status: "closed" as const };
      const targetIsSource = await tx.query.orders.findFirst({
        where: eq(orders.mergedIntoOrderId, source.id),
      });
      if (
        source.mergedIntoOrderId ||
        target.mergedIntoOrderId ||
        targetIsSource
      )
        return { status: "already_merged" as const };
      const [updated] = await tx
        .update(orders)
        .set({ mergedIntoOrderId: target.id, updatedAt: new Date() })
        .where(
          and(eq(orders.id, source.id), eq(orders.tenantId, data.tenantId)),
        )
        .returning();
      return { status: "ok" as const, source: updated!, target };
    });
  },
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

  async findById(tenantId: string, orderId: string) {
    return db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)),
      with: {
        items: {
          with: {
            modifiers: true,
            station: true,
            seatShares: true,
            comboSlotOption: true,
          },
        },
        kitchenTickets: {
          with: {
            course: true,
            items: {
              with: {
                modifiers: true,
                station: true,
                seatShares: true,
                comboSlotOption: true,
              },
            },
          },
          orderBy: asc(kitchenTickets.ticketNumber),
        },
        statusHistory: {
          with: { cancellationReason: true },
          orderBy: desc(orderStatusHistory.changedAt),
        },
        table: true,
        createdByUser: true,
        bills: { with: { payments: true, itemAssignments: true } },
        payments: true,
      },
    });
  },

  async searchSummaries(
    tenantId: string,
    branchId: string | null | undefined,
    query: string,
    requestedLimit?: number,
  ) {
    const limit = Math.min(20, Math.max(1, requestedLimit ?? 8));
    const search = query.trim().replace(/^#/, "").toLowerCase();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        search,
      );
    const shortId = search.slice(-8);
    const idPredicate = isUuid
      ? eq(orders.id, search)
      : sql`right(${orders.id}::text, 8) = ${shortId}`;

    return db
      .select({
        id: orders.id,
        status: orders.status,
        type: orders.type,
        createdAt: orders.createdAt,
        tableId: restaurantTables.id,
        tableName: restaurantTables.name,
      })
      .from(orders)
      .leftJoin(restaurantTables, eq(restaurantTables.id, orders.tableId))
      .where(
        and(
          eq(orders.tenantId, tenantId),
          branchId ? eq(orders.branchId, branchId) : undefined,
          idPredicate,
        ),
      )
      .orderBy(desc(orders.createdAt))
      .limit(limit);
  },

  async findMany(
    tenantId: string,
    branchId: string | null | undefined,
    filters?: {
      status?: string | undefined;
      type?: string | undefined;
      search?: string | undefined;
      view?: "READY" | "ACTIVE" | "ALL" | undefined;
      page?: number | undefined;
      limit?: number | undefined;
      sortBy?: "id" | "total" | "createdAt" | undefined;
      sortDirection?: "asc" | "desc" | undefined;
    },
  ) {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 25));
    const search = filters?.search?.trim();
    const where = and(
      eq(orders.tenantId, tenantId),
      branchId ? eq(orders.branchId, branchId) : undefined,
      filters?.status
        ? eq(orders.status, filters.status as OrderStatus)
        : undefined,
      filters?.type ? eq(orders.type, filters.type as OrderType) : undefined,
      search
        ? (() => {
            const value = search.replace(/^#/, "").toLowerCase();
            const isUuid =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
                value,
              );
            return isUuid
              ? eq(orders.id, value)
              : value.length >= 8
                ? sql`right(${orders.id}::text, 8) = ${value.slice(-8)}`
                : sql`false`;
          })()
        : undefined,
      filters?.view === "ACTIVE"
        ? inArray(orders.status, ["OPEN", "BILL_REQUESTED"])
        : undefined,
      filters?.view === "READY"
        ? exists(
            db
              .select({ value: sql`1` })
              .from(kitchenTickets)
              .where(
                and(
                  eq(kitchenTickets.orderId, orders.id),
                  eq(kitchenTickets.status, "READY"),
                ),
              ),
          )
        : undefined,
    );
    const sortColumn =
      filters?.sortBy === "id"
        ? orders.id
        : filters?.sortBy === "total"
          ? orders.totalAmount
          : orders.createdAt;
    const orderBy =
      filters?.sortDirection === "asc" ? asc(sortColumn) : desc(sortColumn);
    const [rows, totals] = await Promise.all([
      db.query.orders.findMany({
        where,
        with: {
          items: {
            columns: {
              availabilitySnapshot: false,
              pricingReplayEvidence: false,
              availabilityReplayEvidence: false,
            },
          },
          kitchenTickets: {
            columns: { id: true, status: true, ticketNumber: true },
          },
          table: true,
          createdByUser: true,
          payments: true,
        },
        orderBy,
        limit,
        offset: (page - 1) * limit,
      }),
      db.select({ total: count() }).from(orders).where(where),
    ]);
    return { items: rows, total: totals[0]?.total ?? 0, page, limit };
  },

  async updateStatus(
    tenantId: string,
    orderId: string,
    newStatus: OrderStatus,
    changedBy: string,
    reason?: string | undefined,
    cancellationReasonId?: string | undefined,
    branchId?: string | undefined,
  ) {
    return db.transaction(async (tx) => {
      const [current] = await tx
        .select({ status: orders.status })
        .from(orders)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.tenantId, tenantId),
            branchId ? eq(orders.branchId, branchId) : undefined,
          ),
        );

      if (!current) return undefined;

      await tx.insert(orderStatusHistory).values(
        compact({
          orderId,
          oldStatus: current.status,
          newStatus,
          changedBy,
          reason,
          cancellationReasonId,
        }) as typeof orderStatusHistory.$inferInsert,
      );

      const [updated] = await tx
        .update(orders)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(orders.id, orderId))
        .returning();

      return updated;
    });
  },

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
          throw new Error(
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
