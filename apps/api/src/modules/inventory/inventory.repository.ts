import { eq, and, or, isNull, isNotNull, inArray, sql } from "drizzle-orm";
import type { InventoryTransactionType, InventoryUnit } from "@pos/types";
import { db } from "@/db";
import { InternalError } from "@/core/errors";
import {
  inventoryItems,
  inventoryTransactions,
  recipes,
  menuItems,
  orderInventoryDeductions,
  branches,
  orders,
  kitchenTickets,
  menuItemVariants,
  modifierOptions,
  wasteReasons,
} from "@/db/schema";
import { effectiveModifierAvailability } from "@/modules/menu/availability/availability-view";
import { resolveStockBalance } from "./inventory-stock";

export type StockUpdateResult =
  | { status: "not_found" }
  | { status: "insufficient_stock" }
  | {
      status: "ok";
      item: typeof inventoryItems.$inferSelect;
      transaction: typeof inventoryTransactions.$inferSelect;
    };

export const inventoryRepository = {
  async findBranch(tenantId: string, branchId: string) {
    return db.query.branches.findFirst({
      where: and(
        eq(branches.id, branchId),
        eq(branches.tenantId, tenantId),
        eq(branches.isActive, true),
      ),
      columns: { id: true },
    });
  },
  async findMany(tenantId: string, branchId: string) {
    return db.query.inventoryItems.findMany({
      where: and(
        eq(inventoryItems.tenantId, tenantId),
        eq(inventoryItems.branchId, branchId),
        eq(inventoryItems.isActive, true),
        isNull(inventoryItems.deletedAt),
      ),
      orderBy: inventoryItems.name,
    });
  },

  async findAllBranches(tenantId: string) {
    return db.query.inventoryItems.findMany({
      where: and(
        eq(inventoryItems.tenantId, tenantId),
        eq(inventoryItems.isActive, true),
        isNull(inventoryItems.deletedAt),
      ),
      with: { branch: true },
      orderBy: inventoryItems.name,
    });
  },

  async findById(tenantId: string, id: string) {
    return db.query.inventoryItems.findFirst({
      where: and(
        eq(inventoryItems.id, id),
        eq(inventoryItems.tenantId, tenantId),
      ),
    });
  },

  async findRecentTransactions(
    tenantId: string,
    branchId: string | null,
    limit = 25,
  ) {
    const rows = await db.query.inventoryTransactions.findMany({
      with: {
        inventoryItem: { with: { branch: true } },
        performedByUser: true,
        wasteReason: true,
      },
      orderBy: (transaction, { desc }) => [desc(transaction.createdAt)],
      limit: Math.min(Math.max(limit, 1), 100),
    });
    return rows.filter(
      (row) =>
        row.inventoryItem.tenantId === tenantId &&
        (!branchId || row.inventoryItem.branchId === branchId),
    );
  },

  async create(data: {
    tenantId: string;
    branchId: string;
    name: string;
    unit: InventoryUnit;
    currentStock: number;
    minimumStock: number;
    reorderPoint: number;
    costPerUnit: number;
  }) {
    const [item] = await db
      .insert(inventoryItems)
      .values({
        ...data,
        currentStock: data.currentStock.toFixed(3),
        minimumStock: data.minimumStock.toFixed(3),
        reorderPoint: data.reorderPoint.toFixed(3),
        costPerUnit: data.costPerUnit.toFixed(2),
      })
      .returning();
    return item!;
  },

  async applyStockChange(
    tenantId: string,
    itemId: string,
    quantity: number,
    transactionType: InventoryTransactionType,
    performedBy: string,
    notes?: string | undefined,
    wasteReasonId?: string | null | undefined,
  ): Promise<StockUpdateResult> {
    return db.transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.id, itemId),
            eq(inventoryItems.tenantId, tenantId),
          ),
        );

      if (!item) return { status: "not_found" };

      const balanceBefore = parseFloat(item.currentStock);
      const resolution = resolveStockBalance(
        balanceBefore,
        quantity,
        transactionType,
      );
      if (!resolution.ok) return { status: "insufficient_stock" };

      const balanceAfter = resolution.balanceAfter;

      await tx
        .update(inventoryItems)
        .set({ currentStock: balanceAfter.toFixed(3), updatedAt: new Date() })
        .where(eq(inventoryItems.id, itemId));

      const [transaction] = await tx
        .insert(inventoryTransactions)
        .values({
          inventoryItemId: itemId,
          transactionType,
          quantity: quantity.toFixed(3),
          balanceBefore: balanceBefore.toFixed(3),
          balanceAfter: balanceAfter.toFixed(3),
          notes: notes ?? null,
          performedBy,
          wasteReasonId: wasteReasonId ?? null,
        })
        .returning();

      const [updated] = await tx
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, itemId));

      return { status: "ok", item: updated!, transaction: transaction! };
    });
  },

  async listWasteReasons(tenantId: string, includeInactive = false) {
    return db.query.wasteReasons.findMany({
      where: includeInactive
        ? eq(wasteReasons.tenantId, tenantId)
        : and(
            eq(wasteReasons.tenantId, tenantId),
            eq(wasteReasons.isActive, true),
          ),
      orderBy: wasteReasons.label,
    });
  },

  async findWasteReason(tenantId: string, id: string) {
    return db.query.wasteReasons.findFirst({
      where: and(eq(wasteReasons.id, id), eq(wasteReasons.tenantId, tenantId)),
    });
  },

  async createWasteReason(tenantId: string, label: string) {
    const [row] = await db
      .insert(wasteReasons)
      .values({ tenantId, label })
      .returning();
    return row!;
  },

  async updateWasteReason(
    tenantId: string,
    id: string,
    data: { label?: string; isActive?: boolean },
  ) {
    const [row] = await db
      .update(wasteReasons)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(wasteReasons.id, id), eq(wasteReasons.tenantId, tenantId)))
      .returning();
    return row ?? null;
  },

  async findByIds(tenantId: string, ids: string[]) {
    if (!ids.length) return [];
    return db.query.inventoryItems.findMany({
      where: and(
        eq(inventoryItems.tenantId, tenantId),
        inArray(inventoryItems.id, ids),
      ),
    });
  },

  async findLowStock(tenantId: string, branchId: string) {
    const items = await db.query.inventoryItems.findMany({
      where: and(
        eq(inventoryItems.tenantId, tenantId),
        eq(inventoryItems.branchId, branchId),
        eq(inventoryItems.isActive, true),
      ),
    });
    return items.filter(
      (item) => parseFloat(item.currentStock) <= parseFloat(item.minimumStock),
    );
  },

  async findLowStockAllBranches(tenantId: string) {
    const items = await db.query.inventoryItems.findMany({
      where: and(
        eq(inventoryItems.tenantId, tenantId),
        eq(inventoryItems.isActive, true),
      ),
      with: { branch: true },
    });
    return items.filter(
      (item) => parseFloat(item.currentStock) <= parseFloat(item.minimumStock),
    );
  },

  async findOrderDeductions(orderId: string) {
    return db.query.orderInventoryDeductions.findMany({
      where: eq(orderInventoryDeductions.orderId, orderId),
      with: {
        inventoryItem: true,
        menuItem: { columns: { id: true, name: true } },
      },
      orderBy: (t, { asc }) => [asc(t.deductedAt)],
    });
  },

  async findRequiredRecipeLines(
    tenantId: string,
    branchId: string,
    menuItemIds: string[],
  ) {
    if (!menuItemIds.length) return [];
    return db.query.recipes
      .findMany({
        where: and(
          inArray(recipes.menuItemId, menuItemIds),
          eq(recipes.isOptional, false),
        ),
        with: {
          inventoryItem: true,
          subRecipe: true,
          variant: true,
          modifierOption: true,
          menuItem: {
            columns: {
              enableRecipeDeduction: true,
              tenantId: true,
              branchId: true,
            },
          },
        },
      })
      .then((rows) =>
        rows.filter(
          (row) =>
            row.menuItem.tenantId === tenantId &&
            (row.menuItem.branchId === null ||
              row.menuItem.branchId === branchId) &&
            (!row.inventoryItem ||
              (row.inventoryItem.tenantId === tenantId &&
                row.inventoryItem.branchId === branchId)) &&
            (!row.subRecipe || row.subRecipe.tenantId === tenantId),
        ),
      );
  },

  async findSubRecipeWithIngredients(tenantId: string, subRecipeId: string) {
    return db.query.subRecipes.findFirst({
      where: (t, { and: a, eq: e }) =>
        a(e(t.id, subRecipeId), e(t.tenantId, tenantId)),
      with: {
        ingredients: {
          with: { inventoryItem: true, ingredientSubRecipe: true },
        },
      },
    });
  },

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

  async findAllRecipeMenuItemIds(tenantId: string, branchId: string) {
    const rows = await db
      .selectDistinct({ id: recipes.menuItemId })
      .from(recipes)
      .innerJoin(menuItems, eq(menuItems.id, recipes.menuItemId))
      .where(
        and(
          eq(menuItems.tenantId, tenantId),
          or(eq(menuItems.branchId, branchId), isNull(menuItems.branchId)),
          isNull(menuItems.deletedAt),
        ),
      );
    return rows.map((row) => row.id);
  },

  async findScopedRecipeVariants(tenantId: string, branchId: string) {
    return db
      .selectDistinct({
        id: menuItemVariants.id,
        name: menuItemVariants.name,
        menuItemId: menuItemVariants.menuItemId,
        menuItemName: menuItems.name,
        status: menuItemVariants.status,
        manualOverrideStatus: menuItemVariants.manualOverrideStatus,
        enableRecipeDeduction: menuItems.enableRecipeDeduction,
      })
      .from(recipes)
      .innerJoin(menuItems, eq(menuItems.id, recipes.menuItemId))
      .innerJoin(menuItemVariants, eq(menuItemVariants.id, recipes.variantId))
      .where(
        and(
          eq(menuItems.tenantId, tenantId),
          or(eq(menuItems.branchId, branchId), isNull(menuItems.branchId)),
          isNull(menuItems.deletedAt),
          isNotNull(recipes.variantId),
        ),
      );
  },

  async findScopedRecipeModifierOptions(tenantId: string, branchId: string) {
    const rows = await db
      .selectDistinct({
        id: modifierOptions.id,
        name: modifierOptions.name,
        menuItemId: recipes.menuItemId,
        menuItemName: menuItems.name,
        computedAvailability: modifierOptions.computedAvailability,
        manualOverrideAvailability: modifierOptions.manualOverrideAvailability,
        enableRecipeDeduction: menuItems.enableRecipeDeduction,
      })
      .from(recipes)
      .innerJoin(menuItems, eq(menuItems.id, recipes.menuItemId))
      .innerJoin(
        modifierOptions,
        eq(modifierOptions.id, recipes.modifierOptionId),
      )
      .where(
        and(
          eq(menuItems.tenantId, tenantId),
          or(eq(menuItems.branchId, branchId), isNull(menuItems.branchId)),
          isNull(menuItems.deletedAt),
          isNotNull(recipes.modifierOptionId),
        ),
      );
    return rows.map((row) => ({
      ...row,
      isAvailable: effectiveModifierAvailability(row),
    }));
  },

  async findMenuItemsForAvailability(
    tenantId: string,
    branchId: string,
    menuItemIds: string[],
  ) {
    if (!menuItemIds.length) return [];
    return db.query.menuItems.findMany({
      where: and(
        eq(menuItems.tenantId, tenantId),
        inArray(menuItems.id, menuItemIds),
        isNull(menuItems.deletedAt),
        or(eq(menuItems.branchId, branchId), isNull(menuItems.branchId)),
      ),
      columns: {
        id: true,
        name: true,
        status: true,
        enableRecipeDeduction: true,
      },
    });
  },

  async findNonOptionalIngredients(
    tenantId: string,
    branchId: string,
    menuItemId: string,
  ) {
    return db
      .select({
        quantityRequired: recipes.quantityRequired,
        inventoryItem: inventoryItems,
      })
      .from(recipes)
      .innerJoin(inventoryItems, eq(inventoryItems.id, recipes.inventoryItemId))
      .where(
        and(
          eq(recipes.menuItemId, menuItemId),
          eq(recipes.isOptional, false),
          eq(inventoryItems.tenantId, tenantId),
          eq(inventoryItems.branchId, branchId),
        ),
      );
  },
};
