export type BuilderKind = "combo" | "promotion";
export type ComboPolicy = "FIXED" | "PERCENT_OFF_SUM";
export type PromotionType = "PERCENTAGE" | "FIXED_AMOUNT";

export type MenuChoice = { id: string; name: string; categoryName: string };
export type ComboSlotDraft = {
  id: number;
  name: string;
  menuItemId: string;
  upcharge: string;
};
