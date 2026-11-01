import { InternalError } from "@/core/errors";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  menus,
  organizationMenuItems,
  organizationMemberships,
  organizations,
  tenants,
} from "@/db/schema";

export const organizationRepository = {
  async findMembershipsByUserId(userId: string) {
    return db.query.organizationMemberships.findMany({
      where: and(
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.status, "ACTIVE"),
      ),
      with: { organization: true },
      orderBy: (membership, { asc }) => asc(membership.createdAt),
    });
  },

  async findMembership(userId: string, organizationId: string) {
    return db.query.organizationMemberships.findFirst({
      where: and(
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.status, "ACTIVE"),
      ),
      with: { organization: true },
    });
  },

  async create(
    data: typeof organizations.$inferInsert & { createdBy: string },
  ) {
    return db.transaction(async (tx) => {
      const [organization] = await tx
        .insert(organizations)
        .values(data)
        .returning();
      if (!organization)
        throw new InternalError("Organization creation failed");
      const [membership] = await tx
        .insert(organizationMemberships)
        .values({ userId: data.createdBy, organizationId: organization.id })
        .returning();
      if (!membership)
        throw new InternalError("Organization membership creation failed");
      return { organization, membership };
    });
  },

  async listTenants(organizationId: string) {
    return db.query.tenants.findMany({
      where: eq(tenants.organizationId, organizationId),
      orderBy: [asc(tenants.name)],
    });
  },

  async findTenant(tenantId: string) {
    return db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: { id: true, organizationId: true },
    });
  },

  async listMenus(organizationId: string) {
    return db.query.menus.findMany({
      where: eq(menus.organizationId, organizationId),
      with: { organizationItems: true },
      orderBy: [asc(menus.name)],
    });
  },

  async createMenu(data: {
    organizationId: string;
    name: string;
    description?: string | null;
    status?: "DRAFT" | "PUBLISHED";
    isDefault?: boolean;
    availableChannels?: string[] | null;
    availableFulfillmentTypes?: string[] | null;
    effectiveFrom?: Date | null;
    items: Array<{
      itemSku: string;
      categoryName?: string | null;
      sortOrder?: number;
    }>;
  }) {
    return db.transaction(async (tx) => {
      const [menu] = await tx
        .insert(menus)
        .values({
          tenantId: null,
          organizationId: data.organizationId,
          name: data.name,
          description: data.description ?? null,
          status: data.status ?? "DRAFT",
          isDefault: data.isDefault ?? false,
          availableChannels: data.availableChannels ?? null,
          availableFulfillmentTypes: data.availableFulfillmentTypes ?? null,
          availableBranchIds: null,
          effectiveFrom: data.effectiveFrom ?? null,
        })
        .returning();
      if (!menu)
        throw new InternalError("Organization menu insert returned no row");
      if (data.items.length)
        await tx.insert(organizationMenuItems).values(
          data.items.map((item, index) => ({
            menuId: menu.id,
            itemSku: item.itemSku.trim(),
            categoryName: item.categoryName?.trim() || null,
            sortOrder: item.sortOrder ?? index,
          })),
        );
      return tx.query.menus.findFirst({
        where: eq(menus.id, menu.id),
        with: { organizationItems: true },
      });
    });
  },

  async updateMenu(
    organizationId: string,
    menuId: string,
    data: {
      name?: string;
      description?: string | null;
      status?: "DRAFT" | "PUBLISHED";
      isDefault?: boolean;
      availableChannels?: string[] | null;
      availableFulfillmentTypes?: string[] | null;
      effectiveFrom?: Date | null;
      items?: Array<{
        itemSku: string;
        categoryName?: string | null;
        sortOrder?: number;
      }>;
    },
  ) {
    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(menus)
        .set({
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined
            ? { description: data.description }
            : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.isDefault !== undefined
            ? { isDefault: data.isDefault }
            : {}),
          ...(data.availableChannels !== undefined
            ? { availableChannels: data.availableChannels }
            : {}),
          ...(data.availableFulfillmentTypes !== undefined
            ? { availableFulfillmentTypes: data.availableFulfillmentTypes }
            : {}),
          ...(data.effectiveFrom !== undefined
            ? { effectiveFrom: data.effectiveFrom }
            : {}),
          updatedAt: new Date(),
        })
        .where(
          and(eq(menus.id, menuId), eq(menus.organizationId, organizationId)),
        )
        .returning();
      if (!updated) return undefined;
      if (data.items) {
        await tx
          .delete(organizationMenuItems)
          .where(eq(organizationMenuItems.menuId, menuId));
        if (data.items.length)
          await tx.insert(organizationMenuItems).values(
            data.items.map((item, index) => ({
              menuId,
              itemSku: item.itemSku.trim(),
              categoryName: item.categoryName?.trim() || null,
              sortOrder: item.sortOrder ?? index,
            })),
          );
      }
      return tx.query.menus.findFirst({
        where: eq(menus.id, menuId),
        with: { organizationItems: true },
      });
    });
  },

  async deleteMenu(organizationId: string, menuId: string) {
    const [deleted] = await db
      .delete(menus)
      .where(
        and(eq(menus.id, menuId), eq(menus.organizationId, organizationId)),
      )
      .returning({ id: menus.id });
    return deleted;
  },

  async update(
    id: string,
    changes: Partial<typeof organizations.$inferInsert>,
  ) {
    const [organization] = await db
      .update(organizations)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return organization;
  },
};
