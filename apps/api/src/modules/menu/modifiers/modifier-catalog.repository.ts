import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { menuAllergens, menuTags } from "@/db/schema";

export const modifierCatalogRepository = {
  async findOwnedTagIds(tenantId: string, tagIds: string[]) {
    if (!tagIds.length) return new Set<string>();
    const rows = await db.query.menuTags.findMany({
      where: and(eq(menuTags.tenantId, tenantId), inArray(menuTags.id, tagIds)),
      columns: { id: true },
    });
    return new Set(rows.map((row) => row.id));
  },
  async findTags(tenantId: string) {
    return db.query.menuTags.findMany({
      where: eq(menuTags.tenantId, tenantId),
      orderBy: asc(menuTags.name),
    });
  },

  async createTag(tenantId: string, name: string, color?: string) {
    const [tag] = await db
      .insert(menuTags)
      .values({ tenantId, name, color: color ?? null })
      .returning();
    return tag!;
  },

  async deleteTag(tenantId: string, tagId: string) {
    await db
      .delete(menuTags)
      .where(and(eq(menuTags.id, tagId), eq(menuTags.tenantId, tenantId)));
  },

  async findAllergens() {
    return db.query.menuAllergens.findMany({
      orderBy: asc(menuAllergens.name),
    });
  },
};
