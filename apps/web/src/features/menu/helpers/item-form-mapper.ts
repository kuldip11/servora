import {
  advancedMenuItemPricingSchema,
  type MenuItemFormValues,
} from "@pos/validation";
import type { MenuItemFormPayload } from "@/features/menu/services/menu-items.service";

export type ItemWorkflowPayloadState = {
  pricingMode: "FIXED" | "WEIGHT_BASED" | "OPEN";
  weightUnit: "G" | "KG" | "LB" | "OZ";
  openPriceMin: string;
  openPriceMax: string;
  supportsZones: boolean;
  zonePricingRule: "AVERAGE" | "HIGHER" | "SUM_HALF";
  trackByCount: boolean;
  manualStockCount: string;
  taxMode: "" | "INCLUSIVE" | "EXCLUSIVE";
  displayMode: "STANDARD" | "GUIDED_BUILDER";
  effectiveFrom: string;
  variants: Array<{ id?: string; name: string; price: string }>;
  selectedGroupIds: string[];
  selectedTagIds: string[];
  selectedAllergenIds: string[];
  imageUrls: string[];
};

export const validateAdvancedItemPricing = (state: ItemWorkflowPayloadState) =>
  advancedMenuItemPricingSchema.safeParse({
    pricingMode: state.pricingMode,
    weightUnit: state.pricingMode === "WEIGHT_BASED" ? state.weightUnit : null,
    openPriceMin:
      state.pricingMode === "OPEN" && state.openPriceMin !== ""
        ? Number(state.openPriceMin)
        : null,
    openPriceMax:
      state.pricingMode === "OPEN" && state.openPriceMax !== ""
        ? Number(state.openPriceMax)
        : null,
    supportsZones: state.supportsZones,
    zonePricingRule: state.zonePricingRule,
    manualStockCount:
      state.trackByCount && state.manualStockCount !== ""
        ? Number(state.manualStockCount)
        : null,
  });

export const toMenuItemPayload = ({
  categoryId,
  values,
  workflow,
  isEdit,
}: {
  categoryId: string;
  values: MenuItemFormValues;
  workflow: ItemWorkflowPayloadState;
  isEdit: boolean;
}): MenuItemFormPayload => ({
  categoryId,
  name: values.name.trim(),
  description: values.description.trim() || null,
  basePrice: Number(values.basePrice),
  manualCost: values.manualCost === "" ? null : Number(values.manualCost),
  pricingMode: workflow.pricingMode,
  ...(workflow.pricingMode === "WEIGHT_BASED"
    ? { weightUnit: workflow.weightUnit }
    : isEdit
      ? { weightUnit: null }
      : {}),
  ...(workflow.pricingMode === "OPEN" && workflow.openPriceMin !== ""
    ? { openPriceMin: Number(workflow.openPriceMin) }
    : isEdit
      ? { openPriceMin: null }
      : {}),
  ...(workflow.pricingMode === "OPEN" && workflow.openPriceMax !== ""
    ? { openPriceMax: Number(workflow.openPriceMax) }
    : isEdit
      ? { openPriceMax: null }
      : {}),
  supportsZones: workflow.supportsZones,
  zonePricingRule: workflow.zonePricingRule,
  ...(workflow.trackByCount && workflow.manualStockCount !== ""
    ? { manualStockCount: Number(workflow.manualStockCount) }
    : isEdit
      ? { manualStockCount: null }
      : {}),
  taxRate: values.taxRate ? Number(values.taxRate) : 0,
  taxMode: workflow.taxMode || null,
  foodType: values.foodType,
  spiceLevel: values.spiceLevel || null,
  sku: values.sku.trim() || null,
  prepTimeMinutes:
    values.prepTimeMinutes === "" ? null : parseInt(values.prepTimeMinutes, 10),
  hsnCode: values.hsnCode.trim() || null,
  status: values.status,
  availabilityReason: values.availabilityReason.trim() || null,
  enableRecipeDeduction: values.enableRecipeDeduction,
  displayMode: workflow.displayMode,
  effectiveFrom: workflow.effectiveFrom
    ? new Date(workflow.effectiveFrom).toISOString()
    : null,
  variants: workflow.variants
    .filter((variant) => variant.name.trim())
    .map((variant) => ({
      ...(variant.id ? { id: variant.id } : {}),
      name: variant.name,
      price: parseFloat(variant.price) || 0,
    })),
  modifierGroupIds: workflow.selectedGroupIds,
  tagIds: workflow.selectedTagIds,
  allergenIds: workflow.selectedAllergenIds,
  imageUrls: workflow.imageUrls,
});
