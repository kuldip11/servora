export type SelectionType = "SINGLE" | "MULTIPLE";

export interface ModifierOptionInput {
  id?: string | undefined;
  name: string;
  additionalPrice: number;
  isAvailable?: boolean | undefined;
  maxQuantity?: number | undefined;
  isDefault?: boolean | undefined;
  replacesDefaultComponent?: string | undefined;
  variantPrices?:
    Array<{ variantId: string; additionalPrice: number }> | undefined;
}

export interface CreateModifierGroupInput {
  name: string;
  selectionType?: SelectionType | undefined;
  minSelections?: number | undefined;
  maxSelections?: number | undefined;
  branchId?: string | undefined;
  options?: ModifierOptionInput[] | undefined;
  dependsOnOptionId?: string | null | undefined;
  groupType?: "ADDON" | "SUBSTITUTION" | undefined;
}

export interface UpdateModifierGroupInput {
  name?: string | undefined;
  selectionType?: SelectionType | undefined;
  minSelections?: number | undefined;
  maxSelections?: number | null | undefined;
  options?: ModifierOptionInput[] | undefined;
  dependsOnOptionId?: string | null | undefined;
  groupType?: "ADDON" | "SUBSTITUTION" | undefined;
}

export interface CreateTagInput {
  name: string;
  color?: string | undefined;
}
