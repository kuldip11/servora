import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { modifierGroups } from "@/db/schema";
import { withEffectiveModifierAvailability } from "@/modules/menu/availability/availability-view";

export const modifierReadRepository = {
  async findModifierGroups(tenantId: string, branchId?: string) {
    const groups = await db.query.modifierGroups.findMany({
      where: and(
        eq(modifierGroups.tenantId, tenantId),
        branchId
          ? or(
              eq(modifierGroups.branchId, branchId),
              isNull(modifierGroups.branchId),
            )
          : undefined,
      ),
      orderBy: asc(modifierGroups.sortOrder),
      with: {
        options: {
          orderBy: (t, { asc }) => [asc(t.sortOrder)],
          with: { variantPrices: true },
        },
      },
    });
    return groups.map((group) => ({
      ...group,
      options: group.options.map(withEffectiveModifierAvailability),
    }));
  },

  async findModifierGroup(tenantId: string, groupId: string) {
    return db.query.modifierGroups.findFirst({
      where: and(
        eq(modifierGroups.id, groupId),
        eq(modifierGroups.tenantId, tenantId),
      ),
      columns: {
        id: true,
        branchId: true,
        dependsOnOptionId: true,
        groupType: true,
      },
    });
  },

  async findOwnedModifierGroupIds(
    tenantId: string,
    branchId: string | null,
    groupIds: string[],
  ) {
    if (!groupIds.length) return new Set<string>();
    const rows = await db.query.modifierGroups.findMany({
      where: and(
        eq(modifierGroups.tenantId, tenantId),
        inArray(modifierGroups.id, groupIds),
      ),
      columns: { id: true, branchId: true },
    });
    return new Set(
      rows
        .filter((row) => row.branchId === null || row.branchId === branchId)
        .map((row) => row.id),
    );
  },
};
