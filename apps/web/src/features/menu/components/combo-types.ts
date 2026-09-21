import type { ComboPolicy } from "@/features/menu/helpers/combo-form";

export type ComboSummary = {
  id: string;
  name: string;
  description?: string | null;
  pricePolicy: ComboPolicy;
  fixedPrice?: string | number | null;
  percentOff?: string | number | null;
  slots: Array<{
    id?: string;
    name: string;
    minSelections: number;
    maxSelections: number;
    options: Array<{
      id?: string;
      menuItemId: string;
      variantId?: string | null;
      upcharge: string | number;
      isUnlimitedRefill?: boolean;
    }>;
  }>;
};

export type ComboItemChoice = {
  id: string;
  label: string;
  variants: Array<{ id: string; name: string }>;
};
