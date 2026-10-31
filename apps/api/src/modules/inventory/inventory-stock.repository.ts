import { and, eq, inArray, isNull } from "drizzle-orm";
import type { InventoryTransactionType, InventoryUnit } from "@pos/types";
import { db } from "@/db";
import {
  branches,
  inventoryItems,
  inventoryTransactions,
  orderInventoryDeductions,
  wasteReasons,
} from "@/db/schema";
import { resolveStockBalance } from "./inventory-stock";

export type StockUpdateResult =
  | { status: "not_found" }
  | { status: "insufficient_stock" }
  | {
      status: "ok";
      item: typeof inventoryItems.$inferSelect;
      transaction: typeof inventoryTransactions.$inferSelect;
    };

export const inventoryStockRepository = {
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
};
