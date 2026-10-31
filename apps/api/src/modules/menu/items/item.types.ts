import type { FoodType, MenuItemStatus, SpiceLevel } from "@pos/types";

export interface CreateItemInput {
  categoryId: string;
  name: string;
  description?: string | null | undefined;
  basePrice: number;
  manualCost?: number | null | undefined;
  pricingMode?: "FIXED" | "WEIGHT_BASED" | "OPEN" | undefined;
  weightUnit?: "G" | "KG" | "LB" | "OZ" | undefined;
  openPriceMin?: number | undefined;
  openPriceMax?: number | undefined;
  supportsZones?: boolean | undefined;
  zonePricingRule?: "AVERAGE" | "HIGHER" | "SUM_HALF" | undefined;
  manualStockCount?: number | undefined;
  taxRate?: number | undefined;
  taxMode?: "INCLUSIVE" | "EXCLUSIVE" | null | undefined;
  branchId?: string | undefined;
  foodType?: FoodType | undefined;
  spiceLevel?: SpiceLevel | null | undefined;
  sku?: string | null | undefined;
  prepTimeMinutes?: number | null | undefined;
  sortOrder?: number | undefined;
  hsnCode?: string | null | undefined;
  status?: MenuItemStatus | undefined;
  enableRecipeDeduction?: boolean | undefined;
  isPublished?: boolean | undefined;
  displayMode?: "STANDARD" | "GUIDED_BUILDER" | undefined;
  effectiveFrom?: string | null | undefined;
  availabilityReason?: string | null | undefined;
  variants?: Array<{ name: string; price: number }> | undefined;
  modifierGroupIds?: string[] | undefined;
  tagIds?: string[] | undefined;
  allergenIds?: string[] | undefined;
  imageUrls?: string[] | undefined;
}

export interface UpdateItemInput {
  name?: string | undefined;
  description?: string | null | undefined;
  basePrice?: number | undefined;
  manualCost?: number | null | undefined;
  pricingMode?: "FIXED" | "WEIGHT_BASED" | "OPEN" | undefined;
  weightUnit?: "G" | "KG" | "LB" | "OZ" | null | undefined;
  openPriceMin?: number | null | undefined;
  openPriceMax?: number | null | undefined;
  supportsZones?: boolean | undefined;
  zonePricingRule?: "AVERAGE" | "HIGHER" | "SUM_HALF" | undefined;
  manualStockCount?: number | null | undefined;
  taxRate?: number | undefined;
  taxMode?: "INCLUSIVE" | "EXCLUSIVE" | null | undefined;
  foodType?: FoodType | undefined;
  spiceLevel?: SpiceLevel | null | undefined;
  sku?: string | null | undefined;
  prepTimeMinutes?: number | null | undefined;
  sortOrder?: number | undefined;
  hsnCode?: string | null | undefined;
  status?: MenuItemStatus | undefined;
  availabilityReason?: string | null | undefined;
  enableRecipeDeduction?: boolean | undefined;
  displayMode?: "STANDARD" | "GUIDED_BUILDER" | undefined;
  effectiveFrom?: string | null | undefined;
  tagIds?: string[] | undefined;
  allergenIds?: string[] | undefined;
  modifierGroupIds?: string[] | undefined;
  imageUrls?: string[] | undefined;
  variants?: Array<{ id?: string; name: string; price: number }> | undefined;
}

export interface DuplicateItemInput {
  name?: string | undefined;
  copyRecipes?: boolean | undefined;
  copySchedules?: boolean | undefined;
  copyModifiers?: boolean | undefined;
}
