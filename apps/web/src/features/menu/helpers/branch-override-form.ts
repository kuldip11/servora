import type { MenuItemStatus } from "@pos/types";

export type BranchOverrideDraft = {
  price: string;
  taxRate: string;
  prepTimeMinutes: string;
  status: MenuItemStatus | "";
  isHidden: boolean;
  availabilityReason: string;
};

export const validateBranchOverrideDraft = (
  draft: BranchOverrideDraft,
): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (draft.price) {
    const value = Number(draft.price);
    if (!Number.isFinite(value) || value < 0)
      errors.price = "Price must be 0 or greater";
  }
  if (draft.taxRate) {
    const value = Number(draft.taxRate);
    if (!Number.isFinite(value) || value < 0 || value > 100)
      errors.taxRate = "Tax rate must be between 0 and 100";
  }
  if (draft.prepTimeMinutes) {
    const value = Number(draft.prepTimeMinutes);
    if (!Number.isInteger(value) || value < 0)
      errors.prepTimeMinutes = "Prep time must be a whole number of minutes";
  }
  return errors;
};
