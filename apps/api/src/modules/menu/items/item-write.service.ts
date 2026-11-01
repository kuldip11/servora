import type { AuthContext } from "@/core/auth";
import { requirePermission } from "@/core/auth";
import { InternalError, ValidationError } from "@/core/errors";
import { inventoryService } from "@/modules/inventory/inventory.service";
import {
  buildDiff,
  menuChangeLog,
} from "@/modules/menu/change-log/menu-change-log";
import {
  assertMenuResourceBranch,
  resolveMenuBranch,
} from "@/modules/menu/menu-authorization";
import { itemNotFound } from "./item.errors";
import { itemRepository } from "./item.repository";
import type { CreateItemInput, UpdateItemInput } from "./item.types";
import {
  validateAdvancedItemPricing,
  validateItemReferences,
} from "./item-validation";

export const itemWriteService = {
  async create(auth: AuthContext, input: CreateItemInput) {
    requirePermission(auth, "menu:create");
    const branchId = resolveMenuBranch(auth, input.branchId);
    const category = await itemRepository.findCategory(
      auth.tenantId,
      input.categoryId,
    );
    if (!category) throw itemNotFound(input.categoryId);
    if (category.branchId && category.branchId !== branchId) {
      throw new ValidationError(
        "Category branch does not match the active menu branch",
      );
    }
    validateAdvancedItemPricing(input);
    await validateItemReferences(
      auth.tenantId,
      branchId,
      input.tagIds,
      input.modifierGroupIds,
    );
    const created = await itemRepository.create({
      tenantId: auth.tenantId,
      ...input,
      branchId,
      basePrice: String(input.basePrice),
      manualCost:
        input.manualCost == null ? input.manualCost : String(input.manualCost),
      openPriceMin:
        input.openPriceMin === undefined
          ? undefined
          : String(input.openPriceMin),
      openPriceMax:
        input.openPriceMax === undefined
          ? undefined
          : String(input.openPriceMax),
      taxRate: input.taxRate !== undefined ? String(input.taxRate) : "0",
      effectiveFrom: input.effectiveFrom
        ? new Date(input.effectiveFrom)
        : undefined,
      variants: input.variants?.map((variant) => ({
        name: variant.name,
        price: String(variant.price),
      })),
    });
    if (!created) throw new InternalError("Menu item could not be created");
    await menuChangeLog.record(
      auth,
      "MENU_ITEM",
      created.id,
      "CREATED",
      buildDiff(null, created),
    );
    return created;
  },

  async update(auth: AuthContext, itemId: string, input: UpdateItemInput) {
    requirePermission(auth, "menu:update");
    const existing = await itemRepository.findById(auth.tenantId, itemId);
    if (!existing) throw itemNotFound(itemId);
    assertMenuResourceBranch(auth, existing.branchId);
    const {
      tagIds,
      allergenIds,
      modifierGroupIds,
      imageUrls,
      variants,
      ...itemFields
    } = input;
    validateAdvancedItemPricing(itemFields, existing);
    await validateItemReferences(
      auth.tenantId,
      existing.branchId,
      tagIds,
      modifierGroupIds,
    );
    if (variants !== undefined) {
      const variantValidation = await itemRepository.validateVariantSync(
        auth.tenantId,
        itemId,
        variants.map((variant) => ({
          ...(variant.id ? { id: variant.id } : {}),
          name: variant.name,
          price: String(variant.price),
        })),
      );
      if (!variantValidation.ok) {
        if (variantValidation.reason === "VARIANT_IN_USE") {
          throw new ValidationError(
            "This variant is already used by an order or combo and cannot be deleted. Rename it or change its price instead.",
          );
        }
        throw new ValidationError(
          "One or more variants do not belong to this menu item",
        );
      }
    }

    const updated = await itemRepository.update(auth.tenantId, itemId, {
      ...itemFields,
      basePrice:
        itemFields.basePrice !== undefined
          ? String(itemFields.basePrice)
          : undefined,
      manualCost:
        itemFields.manualCost === undefined
          ? undefined
          : itemFields.manualCost === null
            ? null
            : String(itemFields.manualCost),
      taxRate:
        itemFields.taxRate !== undefined
          ? String(itemFields.taxRate)
          : undefined,
      openPriceMin:
        itemFields.openPriceMin === undefined
          ? undefined
          : itemFields.openPriceMin === null
            ? null
            : String(itemFields.openPriceMin),
      openPriceMax:
        itemFields.openPriceMax === undefined
          ? undefined
          : itemFields.openPriceMax === null
            ? null
            : String(itemFields.openPriceMax),
      manualStockCountUpdatedAt:
        itemFields.manualStockCount === undefined ? undefined : new Date(),
      effectiveFrom:
        itemFields.effectiveFrom === undefined
          ? undefined
          : itemFields.effectiveFrom
            ? new Date(itemFields.effectiveFrom)
            : null,
    });
    if (!updated) throw itemNotFound(itemId);

    if (tagIds !== undefined) {
      await itemRepository.setTags(auth.tenantId, itemId, tagIds);
    }
    if (allergenIds !== undefined) {
      await itemRepository.setAllergens(auth.tenantId, itemId, allergenIds);
    }
    if (modifierGroupIds !== undefined) {
      await itemRepository.setModifierGroups(
        auth.tenantId,
        itemId,
        modifierGroupIds,
      );
    }
    if (imageUrls !== undefined) {
      await itemRepository.setImages(auth.tenantId, itemId, imageUrls);
    }
    if (variants !== undefined) {
      const variantsUpdated = await itemRepository.setVariants(
        auth.tenantId,
        itemId,
        variants.map((variant) => ({
          ...(variant.id ? { id: variant.id } : {}),
          name: variant.name,
          price: String(variant.price),
        })),
      );
      if (!variantsUpdated) {
        throw new ValidationError(
          "One or more variants do not belong to this menu item",
        );
      }
    }

    const result = await itemRepository.findById(auth.tenantId, itemId);
    if (!result) throw itemNotFound(itemId);
    await menuChangeLog.record(
      auth,
      "MENU_ITEM",
      itemId,
      "UPDATED",
      buildDiff(existing, result),
    );
    if (
      existing.enableRecipeDeduction !== result.enableRecipeDeduction &&
      result.branchId
    ) {
      if (result.enableRecipeDeduction) {
        await inventoryService.syncRecipeConfigurationAvailability(
          auth.tenantId,
          result.branchId,
          itemId,
        );
      } else {
        await inventoryService.clearRecipeAvailabilitySignals(
          auth.tenantId,
          result.branchId,
          itemId,
        );
      }
    }
    return result;
  },
};
