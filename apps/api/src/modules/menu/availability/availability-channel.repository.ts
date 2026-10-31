import { and, eq, inArray, isNull, or } from "drizzle-orm";
import type { MenuItemStatus } from "@pos/types";
import { db } from "@/db";
import { menuItemBranchOverrides, menuItemChannelOverrides } from "@/db/schema";

export const availabilityChannelRepository = {
  async findPricingOverrides(
    tenantId: string,
    menuItemIds: string[],
    branchId: string,
  ) {
    if (menuItemIds.length === 0) return [];
    return db.query.menuItemBranchOverrides.findMany({
      where: and(
        eq(menuItemBranchOverrides.tenantId, tenantId),
        eq(menuItemBranchOverrides.branchId, branchId),
        inArray(menuItemBranchOverrides.menuItemId, menuItemIds),
      ),
    });
  },

  async listChannelOverrides(tenantId: string, itemId: string) {
    return db.query.menuItemChannelOverrides.findMany({
      where: and(
        eq(menuItemChannelOverrides.tenantId, tenantId),
        eq(menuItemChannelOverrides.menuItemId, itemId),
      ),
    });
  },

  async getChannelOverride(
    tenantId: string,
    itemId: string,
    channel: string,
    fulfillmentType: string,
  ) {
    const rows = await db.query.menuItemChannelOverrides.findMany({
      where: and(
        eq(menuItemChannelOverrides.tenantId, tenantId),
        eq(menuItemChannelOverrides.menuItemId, itemId),
        eq(menuItemChannelOverrides.channel, channel),
        or(
          eq(menuItemChannelOverrides.fulfillmentType, fulfillmentType),
          isNull(menuItemChannelOverrides.fulfillmentType),
        ),
      ),
    });
    return (
      rows.find((row) => row.fulfillmentType === fulfillmentType) ??
      rows.find((row) => row.fulfillmentType === null)
    );
  },

  async upsertChannelOverride(
    tenantId: string,
    itemId: string,
    channel: string,
    fulfillmentType: string | null,
    data: {
      status?: MenuItemStatus | null;
      isHidden?: boolean;
      availabilityReason?: string | null;
    },
  ) {
    const existing = (
      await availabilityChannelRepository.listChannelOverrides(tenantId, itemId)
    ).find(
      (row) =>
        row.channel === channel && row.fulfillmentType === fulfillmentType,
    );
    if (existing) {
      const [updated] = await db
        .update(menuItemChannelOverrides)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(menuItemChannelOverrides.id, existing.id))
        .returning();
      return updated!;
    }
    const [created] = await db
      .insert(menuItemChannelOverrides)
      .values({
        tenantId,
        menuItemId: itemId,
        channel,
        fulfillmentType,
        ...data,
      })
      .returning();
    return created!;
  },

  async deleteChannelOverride(tenantId: string, id: string) {
    await db
      .delete(menuItemChannelOverrides)
      .where(
        and(
          eq(menuItemChannelOverrides.tenantId, tenantId),
          eq(menuItemChannelOverrides.id, id),
        ),
      );
  },
};
