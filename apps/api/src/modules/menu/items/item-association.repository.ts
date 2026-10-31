import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  menuItems,
  menuItemModifierGroups,
  menuItemTags,
  menuItemAllergens,
  menuItemImages,
} from "@/db/schema";

export const itemAssociationRepository = {
  async setTags(tenantId: string, itemId: string, tagIds: string[]) {
    const item = await db.query.menuItems.findFirst({
      where: and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)),
      columns: { id: true },
    });
    if (!item) return;
    await db.delete(menuItemTags).where(eq(menuItemTags.menuItemId, itemId));
    if (tagIds.length) {
      await db
        .insert(menuItemTags)
        .values(tagIds.map((tagId) => ({ menuItemId: itemId, tagId })));
    }
  },

  async setAllergens(tenantId: string, itemId: string, allergenIds: string[]) {
    const item = await db.query.menuItems.findFirst({
      where: and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)),
      columns: { id: true },
    });
    if (!item) return;
    await db
      .delete(menuItemAllergens)
      .where(eq(menuItemAllergens.menuItemId, itemId));
    if (allergenIds.length) {
      await db
        .insert(menuItemAllergens)
        .values(
          allergenIds.map((allergenId) => ({ menuItemId: itemId, allergenId })),
        );
    }
  },

  async setModifierGroups(
    tenantId: string,
    itemId: string,
    modifierGroupIds: string[],
  ) {
    const item = await db.query.menuItems.findFirst({
      where: and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)),
      columns: { id: true },
    });
    if (!item) return;
    await db
      .delete(menuItemModifierGroups)
      .where(eq(menuItemModifierGroups.menuItemId, itemId));
    if (modifierGroupIds.length) {
      await db.insert(menuItemModifierGroups).values(
        modifierGroupIds.map((modifierGroupId, i) => ({
          menuItemId: itemId,
          modifierGroupId,
          sortOrder: i,
        })),
      );
    }
  },

  async setImages(tenantId: string, itemId: string, urls: string[]) {
    const item = await db.query.menuItems.findFirst({
      where: and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)),
      columns: { id: true },
    });
    if (!item) return;
    await db
      .delete(menuItemImages)
      .where(eq(menuItemImages.menuItemId, itemId));
    if (urls.length) {
      await db
        .insert(menuItemImages)
        .values(
          urls.map((url, i) => ({ menuItemId: itemId, url, sortOrder: i })),
        );
    }
  },
};
