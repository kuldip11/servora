import * as XLSX from "xlsx";
import type { AuthContext } from "@/core/auth";
import { importExportRepository } from "./import-export.repository";
import { requirePermission } from "@/core/auth";
import { resolveMenuBranch } from "@/modules/menu/menu-authorization";
import {
  parseFile,
  buildTemplate,
  validateRows,
  type ImportItemRow,
  type ValidatedRow,
  type RowError,
} from "./menu-import-parser";
import { noFileUploaded, importValidationFailed } from "./import-export.errors";
import { menuChangeLog } from "@/modules/menu/change-log/menu-change-log";

export type ExportFormat = "csv" | "xlsx";

const toSheet = (
  rows: Record<string, unknown>[],
  format: ExportFormat,
): { content: string | Buffer; contentType: string } => {
  const sheet = XLSX.utils.json_to_sheet(rows);
  if (format === "csv") {
    return { content: XLSX.utils.sheet_to_csv(sheet), contentType: "text/csv" };
  }
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Sheet1");
  const buffer = XLSX.write(book, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;
  return {
    content: buffer,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
};

export const importExportService = {
  async exportItems(
    auth: AuthContext,
    format: ExportFormat,
    branchId?: string | undefined,
  ) {
    requirePermission(auth, "menu:read");
    const effectiveBranchId = resolveMenuBranch(auth, branchId);
    const items = await importExportRepository.findItemsForExport(
      auth.tenantId,
      effectiveBranchId,
    );
    const rows = items.map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category?.name ?? "",
      description: i.description ?? "",
      basePrice: i.basePrice,
      taxRate: i.taxRate,
      foodType: i.foodType,
      spiceLevel: i.spiceLevel ?? "",
      sku: i.sku ?? "",
      status: i.status,
      hsnCode: i.hsnCode ?? "",
      prepTimeMinutes: i.prepTimeMinutes ?? "",
    }));
    return toSheet(rows, format);
  },

  async exportCategories(auth: AuthContext, format: ExportFormat) {
    requirePermission(auth, "menu:read");
    const effectiveBranchId = resolveMenuBranch(auth);
    const cats = await importExportRepository.findCategoriesForExport(
      auth.tenantId,
      effectiveBranchId,
    );
    const rows = cats.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description ?? "",
      sortOrder: c.sortOrder,
      isActive: c.isActive,
    }));
    return toSheet(rows, format);
  },

  async exportRecipes(auth: AuthContext, format: ExportFormat) {
    requirePermission(auth, "menu:read");
    const effectiveBranchId = resolveMenuBranch(auth);
    const rows_ = await importExportRepository.findRecipesForExport(
      auth.tenantId,
      effectiveBranchId,
    );
    const rows = rows_.map((r) => ({
      menuItem: r.menuItem.name,
      ingredient: r.inventoryItem?.name ?? r.subRecipe?.name ?? "",
      quantityRequired: r.quantityRequired,
      unit: r.unit,
      isOptional: r.isOptional,
    }));
    return toSheet(rows, format);
  },

  async exportModifiers(auth: AuthContext, format: ExportFormat) {
    requirePermission(auth, "menu:read");
    const effectiveBranchId = resolveMenuBranch(auth);
    const groups = await importExportRepository.findModifiersForExport(
      auth.tenantId,
      effectiveBranchId,
    );
    const rows: Record<string, unknown>[] = [];
    for (const g of groups) {
      if (!g.options.length) {
        rows.push({
          modifierGroup: g.name,
          selectionType: g.selectionType,
          option: "",
          additionalPrice: "",
          isAvailable: "",
        });
        continue;
      }
      for (const o of g.options) {
        rows.push({
          modifierGroup: g.name,
          selectionType: g.selectionType,
          option: o.name,
          additionalPrice: o.additionalPrice,
          isAvailable: o.manualOverrideAvailability ?? o.computedAvailability,
        });
      }
    }
    return toSheet(rows, format);
  },

  parseFile,
  buildTemplate,

  requireFile(file: File | undefined | null): void {
    if (!file) throw noFileUploaded();
  },

  async parseUpload(file: File): Promise<ImportItemRow[]> {
    const buffer = await file.arrayBuffer();
    return parseFile(buffer, file.name);
  },

  async validateItemsImport(
    auth: AuthContext,
    rows: ImportItemRow[],
  ): Promise<{ valid: ValidatedRow[]; errors: RowError[] }> {
    requirePermission(auth, "menu:create");
    const effectiveBranchId = resolveMenuBranch(auth);
    const categories = await importExportRepository.findCategoriesForImport(
      auth.tenantId,
      effectiveBranchId,
    );
    const categoryByName = new Map(
      categories.map((c) => [c.name.trim().toLowerCase(), c.id]),
    );

    const existingSkus = await importExportRepository.findExistingSkuItems(
      auth.tenantId,
      effectiveBranchId,
    );
    const existingItemIds = new Set(existingSkus.map((i) => i.id));
    const skuToItemId = new Map(
      existingSkus
        .filter((i) => i.sku)
        .map((i) => [i.sku!.trim().toLowerCase(), i.id]),
    );

    return validateRows(rows, categoryByName, existingItemIds, skuToItemId);
  },

  async commitItemsImport(
    auth: AuthContext,
    rows: ImportItemRow[],
  ): Promise<{ inserted: number; updated: number; errors: RowError[] }> {
    const { valid, errors } = await this.validateItemsImport(auth, rows);

    requirePermission(auth, "menu:create");
    const effectiveBranchId = resolveMenuBranch(auth);
    const {
      inserted,
      updated,
      touched = [],
    } = valid.length
      ? await importExportRepository.commitRows(
          auth.tenantId,
          effectiveBranchId,
          valid.map((r) => ({ action: r.action, data: r.data })),
        )
      : { inserted: 0, updated: 0, touched: [] };

    await menuChangeLog.recordMany(
      auth,
      touched.map((row) => ({
        entityType: "MENU_ITEM",
        entityId: row.id,
        changeType: row.action === "insert" ? "CREATED" : "UPDATED",
        diff: { source: "IMPORT", ...row.data },
      })),
    );

    if (errors.length && inserted === 0 && updated === 0) {
      throw importValidationFailed({ inserted, updated, errors });
    }

    return { inserted, updated, errors };
  },
};
