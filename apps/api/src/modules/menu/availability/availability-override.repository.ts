import { and, eq, isNull } from "drizzle-orm";
import type { MenuItemStatus } from "@pos/types";
import { db } from "@/db";
import { branches, menuItemBranchOverrides, menuItems } from "@/db/schema";

export const availabilityOverrideRepository = {
  async setManualOverride(
    tenantId: string,
    itemId: string,
    status: MenuItemStatus,
    reason: string,
    userId: string,
  ) {
    const [row] = await db
      .update(menuItems)
      .set({
        manualOverrideStatus: status,
        manualOverrideReason: reason,
        manualOverrideSetBy: userId,
        manualOverrideSetAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(menuItems.id, itemId),
          eq(menuItems.tenantId, tenantId),
          isNull(menuItems.deletedAt),
        ),
      )
      .returning();
    return row;
  },

  async clearManualOverride(tenantId: string, itemId: string) {
    const [row] = await db
      .update(menuItems)
      .set({
        manualOverrideStatus: null,
        manualOverrideReason: null,
        manualOverrideSetBy: null,
        manualOverrideSetAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(menuItems.id, itemId),
          eq(menuItems.tenantId, tenantId),
          isNull(menuItems.deletedAt),
        ),
      )
      .returning();
    return row;
  },

  async getOverride(tenantId: string, menuItemId: string, branchId: string) {
    return db.query.menuItemBranchOverrides.findFirst({
      where: and(
        eq(menuItemBranchOverrides.tenantId, tenantId),
        eq(menuItemBranchOverrides.menuItemId, menuItemId),
        eq(menuItemBranchOverrides.branchId, branchId),
      ),
    });
  },

  async listOverridesForItem(tenantId: string, menuItemId: string) {
    return db.query.menuItemBranchOverrides.findMany({
      where: and(
        eq(menuItemBranchOverrides.tenantId, tenantId),
        eq(menuItemBranchOverrides.menuItemId, menuItemId),
      ),
      with: { branch: true },
    });
  },

  async findBranch(tenantId: string, branchId: string) {
    return db.query.branches.findFirst({
      where: and(eq(branches.id, branchId), eq(branches.tenantId, tenantId)),
      columns: { id: true },
    });
  },

  async upsertOverride(
    tenantId: string,
    menuItemId: string,
    branchId: string,
    values: {
      price: string | null;
      taxRate: string | null;
      prepTimeMinutes: number | null;
      status: MenuItemStatus | null;
      isHidden: boolean;
      availabilityReason: string | null;
    },
  ) {
    const [row] = await db
      .insert(menuItemBranchOverrides)
      .values({ tenantId, menuItemId, branchId, ...values })
      .onConflictDoUpdate({
        target: [
          menuItemBranchOverrides.menuItemId,
          menuItemBranchOverrides.branchId,
        ],
        set: { ...values, updatedAt: new Date() },
      })
      .returning();
    return row;
  },

  async deleteOverride(tenantId: string, menuItemId: string, branchId: string) {
    await db
      .delete(menuItemBranchOverrides)
      .where(
        and(
          eq(menuItemBranchOverrides.tenantId, tenantId),
          eq(menuItemBranchOverrides.menuItemId, menuItemId),
          eq(menuItemBranchOverrides.branchId, branchId),
        ),
      );
  },
};
