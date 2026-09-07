import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const menuRoot = fileURLToPath(new URL("../..", import.meta.url));

const writeMethods: Record<string, string[]> = {
  "items/item.service.ts": [
    "create",
    "update",
    "remove",
    "duplicate",
    "publish",
    "unpublish",
    "updateStatus",
    "updateAvailability",
  ],
  "categories/category.service.ts": ["create", "update", "deactivate"],
  "menus/menu.service.ts": [
    "create",
    "update",
    "publish",
    "unpublish",
    "remove",
  ],
  "memberships/membership.service.ts": ["assign", "remove"],
  "pricing/price-rule.service.ts": ["create", "update", "remove"],
  "modifiers/modifier.service.ts": [
    "createGroup",
    "updateGroup",
    "deleteGroup",
    "setOptionAvailability",
    "createTag",
    "deleteTag",
  ],
  "recipes/recipes.service.ts": ["setItemRecipe"],
  "templates/templates.service.ts": ["createFromCategory", "apply", "delete"],
  "bulk-ops/bulk-ops.service.ts": [
    "updateItemsStatus",
    "updateItemsCategory",
    "bulkSetItemTags",
    "bulkSetItemModifierGroups",
    "bulkUpdatePrice",
    "bulkDeleteItems",
  ],
  "import-export/import-export.service.ts": ["commitItemsImport"],
};

describe("menu write audit coverage", () => {
  for (const [relativePath, methods] of Object.entries(writeMethods)) {
    it(`${relativePath} records every public write`, () => {
      const source = readFileSync(`${menuRoot}/${relativePath}`, "utf8");
      for (const method of methods) {
        const start = source.indexOf(`async ${method}(`);
        expect(start, `${method} must exist`).toBeGreaterThanOrEqual(0);
        const next = source.indexOf("\n  async ", start + 1);
        const body = source.slice(start, next < 0 ? source.length : next);
        expect(
          body.includes("menuChangeLog.record") ||
            body.includes("recordItems("),
          `${relativePath}:${method} must record a menu change`,
        ).toBe(true);
      }
    });
  }

  it("availability controller records every authenticated availability write", () => {
    const source = readFileSync(
      `${menuRoot}/availability/availability.controller.ts`,
      "utf8",
    );
    for (const method of [
      "createSchedule",
      "updateSchedule",
      "deleteSchedule",
      "createHoliday",
      "updateHoliday",
      "deleteHoliday",
      "setManualOverride",
      "clearManualOverride",
      "upsertOverride",
      "deleteOverride",
    ]) {
      const start = source.indexOf(`async ${method}(`);
      const next = source.indexOf("\n  async ", start + 1);
      expect(source.slice(start, next < 0 ? source.length : next)).toContain(
        "menuChangeLog.record",
      );
    }
  });
});
