import type { OrderItemInput } from "@/modules/orders/pricing/pricing-pipeline";

export interface PromotionInput {
  name: string;
  ruleType: "PERCENTAGE" | "FIXED_AMOUNT" | "BOGO";
  scope: "ORDER" | "CATEGORY" | "ITEM";
  scopeCategoryId?: string | null;
  scopeMenuItemId?: string | null;
  value?: number;
  couponCode?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  maxUsesTotal?: number | null;
  maxUsesPerCustomer?: number | null;
  triggerMenuItemId?: string | null;
  triggerCategoryId?: string | null;
  rewardMenuItemId?: string | null;
  rewardCategoryId?: string | null;
  rewardDiscountPercent?: number | null;
  triggerQuantity?: number | null;
  rewardQuantity?: number | null;
  stackableWithLoyalty?: boolean;
  isActive?: boolean;
}

export interface PromotionPreviewInput {
  promotion: PromotionInput;
  items: OrderItemInput[];
}
