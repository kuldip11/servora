import { InternalError } from "@/core/errors";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { menuItems, menuMemberships, menuSchedules, menus } from "@/db/schema";
import { compact } from "@/lib/object-utils";

export const menuRepository = {
  async ensureDefaultMenu(tenantId: string) {
    return db.transaction(async (tx) => {
      const existing = await tx.query.menus.findFirst({
        where: and(eq(menus.tenantId, tenantId), eq(menus.isDefault, true)),
      });
      if (existing) return existing;

      const [created] = await tx
        .insert(menus)
        .values({
          tenantId,
          name: "Default Menu",
          status: "PUBLISHED",
          isDefault: true,
        })
        .onConflictDoNothing()
        .returning();

      const defaultMenu =
        created ??
        (await tx.query.menus.findFirst({
          where: and(eq(menus.tenantId, tenantId), eq(menus.isDefault, true)),
        }));
      if (!defaultMenu)
        throw new InternalError("Default menu could not be created");

      if (created) {
        const existingItems = await tx.query.menuItems.findMany({
          where: and(
            eq(menuItems.tenantId, tenantId),
            isNull(menuItems.deletedAt),
          ),
          columns: { id: true, categoryId: true, sortOrder: true },
        });
        if (existingItems.length) {
          await tx
            .insert(menuMemberships)
            .values(
              existingItems.map((item) => ({
                menuId: defaultMenu.id,
                menuItemId: item.id,
                categoryId: item.categoryId,
                sortOrder: item.sortOrder,
              })),
            )
            .onConflictDoNothing();
        }
      }

      return defaultMenu;
    });
  },
  async list(tenantId: string) {
    return db.query.menus.findMany({
      where: eq(menus.tenantId, tenantId),
      orderBy: [asc(menus.name)],
    });
  },
  async listActive(
    tenantId: string,
    branchId: string,
    channel: "STAFF" | "CUSTOMER_QR",
    fulfillmentType: "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ONLINE",
  ) {
    const { menuResolver } = await import("./menu-resolver.service");
    return menuResolver.getActiveMenus(
      tenantId,
      branchId,
      channel,
      fulfillmentType,
      new Date(),
    );
  },

  async findById(tenantId: string, id: string) {
    return db.query.menus.findFirst({
      where: and(eq(menus.tenantId, tenantId), eq(menus.id, id)),
    });
  },

  async create(data: {
    tenantId: string;
    name: string;
    description?: string | undefined;
  }) {
    const [created] = await db
      .insert(menus)
      .values(compact(data) as typeof menus.$inferInsert)
      .returning();
    return created!;
  },

  async update(
    tenantId: string,
    id: string,
    data: {
      name?: string | undefined;
      description?: string | null | undefined;
      status?: "DRAFT" | "PUBLISHED" | undefined;
      availableChannels?: string[] | null | undefined;
      availableFulfillmentTypes?: string[] | null | undefined;
      availableBranchIds?: string[] | null | undefined;
      effectiveFrom?: Date | null | undefined;
    },
  ) {
    const [updated] = await db
      .update(menus)
      .set(compact({ ...data, updatedAt: new Date() }))
      .where(and(eq(menus.tenantId, tenantId), eq(menus.id, id)))
      .returning();
    return updated;
  },

  async remove(tenantId: string, id: string) {
    const [removed] = await db
      .delete(menus)
      .where(and(eq(menus.tenantId, tenantId), eq(menus.id, id)))
      .returning({ id: menus.id });
    return removed;
  },
  async listSchedules(tenantId: string, menuId: string) {
    return db.query.menuSchedules.findMany({
      where: and(
        eq(menuSchedules.tenantId, tenantId),
        eq(menuSchedules.menuId, menuId),
      ),
    });
  },
  async createSchedule(data: typeof menuSchedules.$inferInsert) {
    const [created] = await db.insert(menuSchedules).values(data).returning();
    return created!;
  },
  async deleteSchedule(tenantId: string, id: string) {
    await db
      .delete(menuSchedules)
      .where(
        and(eq(menuSchedules.tenantId, tenantId), eq(menuSchedules.id, id)),
      );
  },
};
