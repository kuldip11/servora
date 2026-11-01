import { ValidationError } from "@/core/errors";
import { modifierRepository } from "@/modules/menu/modifiers/modifier.repository";

interface AdvancedPricingInput {
  pricingMode?: "FIXED" | "WEIGHT_BASED" | "OPEN" | undefined;
  weightUnit?: "G" | "KG" | "LB" | "OZ" | null | undefined;
  openPriceMin?: number | null | undefined;
  openPriceMax?: number | null | undefined;
  supportsZones?: boolean | undefined;
  zonePricingRule?: "AVERAGE" | "HIGHER" | "SUM_HALF" | undefined;
  manualStockCount?: number | null | undefined;
}

interface ExistingPricing {
  pricingMode?: string;
  weightUnit?: string | null;
  openPriceMin?: string | null;
  openPriceMax?: string | null;
}

export const validateItemReferences = async (
  tenantId: string,
  branchId: string | null | undefined,
  tagIds: string[] | undefined,
  modifierGroupIds: string[] | undefined,
) => {
  if (tagIds?.length) {
    const ownedTags = await modifierRepository.findOwnedTagIds(
      tenantId,
      tagIds,
    );
    const invalid = tagIds.filter((id) => !ownedTags.has(id));
    if (invalid.length) {
      throw new ValidationError(
        "One or more menu tags do not belong to this tenant",
      );
    }
  }

  if (modifierGroupIds?.length) {
    const ownedGroups = await modifierRepository.findOwnedModifierGroupIds(
      tenantId,
      branchId ?? null,
      modifierGroupIds,
    );
    const invalid = modifierGroupIds.filter((id) => !ownedGroups.has(id));
    if (invalid.length) {
      throw new ValidationError(
        "One or more modifier groups are outside the active tenant or branch",
      );
    }
  }
};

export const validateAdvancedItemPricing = (
  input: AdvancedPricingInput,
  fallback?: ExistingPricing,
) => {
  const mode = input.pricingMode ?? fallback?.pricingMode ?? "FIXED";
  const weightUnit =
    input.weightUnit === undefined ? fallback?.weightUnit : input.weightUnit;
  if (mode === "WEIGHT_BASED" && !weightUnit) {
    throw new ValidationError("Weight-based items require a weight unit");
  }

  const min =
    input.openPriceMin === undefined
      ? fallback?.openPriceMin == null
        ? null
        : Number(fallback.openPriceMin)
      : input.openPriceMin;
  const max =
    input.openPriceMax === undefined
      ? fallback?.openPriceMax == null
        ? null
        : Number(fallback.openPriceMax)
      : input.openPriceMax;
  if (min != null && max != null && min > max) {
    throw new ValidationError("Open-price minimum cannot exceed maximum");
  }
  if (
    input.manualStockCount != null &&
    (!Number.isInteger(input.manualStockCount) || input.manualStockCount < 0)
  ) {
    throw new ValidationError(
      "Manual stock count must be a non-negative integer",
    );
  }
};
