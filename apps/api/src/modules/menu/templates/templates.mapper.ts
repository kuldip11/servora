import type {
  MenuTemplateApplyResponse,
  MenuTemplateResponse,
} from "@pos/contracts";

export const toMenuTemplateResponse = (row: any): MenuTemplateResponse => ({
  id: row.id,
  tenantId: row.tenantId,
  name: row.name,
  description: row.description ?? null,
  sourceCategoryName: row.sourceCategoryName ?? null,
  createdAt:
    row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  updatedAt:
    row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  items: (row.items ?? []).map((item: any) => ({
    id: item.id,
    templateId: item.templateId,
    name: item.name,
    description: item.description ?? null,
    basePrice: Number(item.basePrice ?? 0),
    taxRate: Number(item.taxRate ?? 0),
    foodType: item.foodType,
    spiceLevel: item.spiceLevel ?? null,
    prepTimeMinutes: item.prepTimeMinutes ?? null,
    hsnCode: item.hsnCode ?? null,
    sortOrder: item.sortOrder ?? 0,
  })),
});

export const toMenuTemplateApplyResponse = (
  row: any,
): MenuTemplateApplyResponse => ({
  category: { id: row.category.id, name: row.category.name },
  items: (row.items ?? []).map((item: any) => ({
    id: item.id,
    name: item.name,
  })),
});
