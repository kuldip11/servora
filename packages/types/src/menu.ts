import type { Branch } from "./auth";
import type { Recipe } from "./inventory";

export type FoodType = "VEG" | "NON_VEG" | "EGG";

export type SpiceLevel = "NONE" | "MILD" | "MEDIUM" | "HOT";

export type ModifierSelectionType = "SINGLE" | "MULTIPLE";

export type MenuItemStatus =
  "ACTIVE" | "OUT_OF_STOCK" | "HIDDEN" | "SEASONAL" | "DISCONTINUED";

export type MenuItemScheduleType =
  "DAILY" | "WEEKLY" | "SPECIFIC_DATE" | "HOLIDAY";

export interface PriceRule {
  id: string;
  tenantId: string | null;
  organizationId?: string | null;
  menuItemId: string | null;
  menuItemSku?: string | null;
  variantId: string | null;
  branchId: string | null;
  channel: "STAFF" | "CUSTOMER_QR" | null;
  fulfillmentType: "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ONLINE" | null;
  customerGroupId?: string | null;
  coverTier?: "ADULT" | "CHILD" | null;
  isPerCover?: boolean;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  price: string | null;
  percentOff: string | null;
  taxRate: string | null;
  priority: number;
  isActive: boolean;
  effectiveFrom?: string | null;
}

export type PromotionRuleType = "PERCENTAGE" | "FIXED_AMOUNT" | "BOGO";
export type PromotionScope = "ORDER" | "CATEGORY" | "ITEM";

export interface Promotion {
  id: string;
  tenantId: string;
  name: string;
  ruleType: PromotionRuleType;
  scope: PromotionScope;
  scopeCategoryId: string | null;
  scopeMenuItemId: string | null;
  value: string | null;
  couponCode: string | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  maxUsesTotal: number | null;
  maxUsesPerCustomer: number | null;
  triggerMenuItemId: string | null;
  triggerCategoryId: string | null;
  rewardMenuItemId: string | null;
  rewardCategoryId: string | null;
  rewardDiscountPercent: string | null;
  triggerQuantity: number | null;
  rewardQuantity: number | null;
  stackableWithLoyalty: boolean;
  isActive: boolean;
}

export interface PromotionStats {
  uses: number;
  discountAmount: string;
}

export interface CustomerLoyaltyTier {
  id: string;
  tenantId?: string | null;
  organizationId?: string | null;
  name: string;
  discountPercent: string | null;
  discountFixed: string | null;
}

export interface LoyaltyCustomer {
  id: string;
  tenantId?: string;
  organizationCustomerId?: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  loyaltyTierId: string | null;
  loyaltyTier?: CustomerLoyaltyTier | null;
}

export type MenuStatus = "DRAFT" | "PUBLISHED";

export interface Menu {
  id: string;
  tenantId: string | null;
  organizationId?: string | null;
  name: string;
  description: string | null;
  status: MenuStatus;
  isDefault: boolean;
  availableChannels: Array<"STAFF" | "CUSTOMER_QR"> | null;
  availableFulfillmentTypes: Array<
    "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ONLINE"
  > | null;
  availableBranchIds: string[] | null;
  effectiveFrom?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MenuMembership {
  id: string;
  menuId: string;
  menuItemId: string;
  categoryId: string;
  sortOrder: number;
  menu?: Menu;
  category?: MenuCategory;
}

export interface MenuItemSchedule {
  id: string;
  tenantId: string;
  menuItemId: string;
  branchId: string | null;
  scheduleType: MenuItemScheduleType;
  startTime: string | null;
  endTime: string | null;
  dayOfWeek: number | null;
  startDate: string | null;
  endDate: string | null;
  holidayName: string | null;
  statusDuringPeriod: MenuItemStatus;
  isActive: boolean;
}

export interface Holiday {
  id: string;
  tenantId: string;
  name: string;
  holidayDate: string;
  region: string | null;
}

export interface EffectiveStatus {
  status: MenuItemStatus;
  reason: string;
  nextChange?: string | null;
}

export interface MenuItemBranchOverride {
  id: string;
  tenantId: string;
  menuItemId: string;
  branchId: string;
  price: number | null;
  taxRate: number | null;
  prepTimeMinutes: number | null;
  status: MenuItemStatus | null;
  isHidden: boolean;
  availabilityReason: string | null;
  branch?: Branch;
}

export interface EffectiveMenuItem extends MenuItem {
  effectivePrice: number;
  effectiveTaxRate: number;
  effectivePrepTimeMinutes: number | null;
  effectiveStatus: MenuItemStatus;
  isHidden: boolean;
  overrideApplied: boolean;
}

export interface MenuCategory {
  id: string;
  tenantId: string;
  branchId: string | null;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  menuItems?: MenuItem[];
}

export interface MenuItem {
  id: string;
  tenantId: string;
  branchId: string | null;
  categoryId: string;
  name: string;
  description: string | null;
  basePrice: number;
  manualCost: number | null;
  pricingMode?: "FIXED" | "WEIGHT_BASED" | "OPEN";
  weightUnit?: "G" | "KG" | "LB" | "OZ" | null;
  openPriceMin?: number | null;
  openPriceMax?: number | null;
  supportsZones?: boolean;
  zonePricingRule?: "AVERAGE" | "HIGHER" | "SUM_HALF";
  manualStockCount?: number | null;
  manualStockCountUpdatedAt?: string | null;
  taxRate: number;
  taxMode?: "INCLUSIVE" | "EXCLUSIVE" | null;
  isAvailable: boolean;
  imageUrl: string | null;
  foodType: FoodType;
  spiceLevel: SpiceLevel | null;
  sku: string | null;
  prepTimeMinutes: number | null;
  sortOrder: number;
  hsnCode: string | null;
  status: MenuItemStatus;
  availabilityReason: string | null;
  statusChangedAt: string;
  manualOverrideStatus?: MenuItemStatus | null;
  manualOverrideReason?: string | null;
  manualOverrideSetBy?: string | null;
  manualOverrideSetAt?: string | null;
  enableRecipeDeduction: boolean;
  displayMode?: "STANDARD" | "GUIDED_BUILDER";
  effectiveFrom?: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  variants: MenuItemVariant[];
  images?: MenuItemImage[];
  modifierGroupLinks?: Array<{
    modifierGroupId: string;
    sortOrder: number;
    group: ModifierGroup;
  }>;
  tagLinks?: Array<{
    tagId: string;
    tag: MenuTag;
  }>;
  allergenLinks?: Array<{
    allergenId: string;
    allergen: MenuAllergen;
  }>;
  recipeLinks?: Recipe[];
  schedules?: MenuItemSchedule[];
  menuMemberships?: MenuMembership[];
}

export interface KitchenStation {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  printerIdentifier: string | null;
  sortOrder: number;
  isDefault: boolean;
}

export interface ItemStationRoute {
  id: string;
  menuItemId: string;
  stationId: string;
  modifierOptionId: string | null;
}

export interface MenuItemVariant {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  status: MenuItemStatus;
  manualOverrideStatus: MenuItemStatus | null;
  manualOverrideReason: string | null;
  manualStockCount?: number | null;
  manualStockCountUpdatedAt?: string | null;
}

export interface MenuItemImage {
  id: string;
  menuItemId: string;
  url: string;
  sortOrder: number;
}

export interface ModifierGroup {
  id: string;
  tenantId: string;
  branchId: string | null;
  name: string;
  selectionType: ModifierSelectionType;
  groupType?: "ADDON" | "SUBSTITUTION";
  minSelections: number;
  maxSelections: number | null;
  sortOrder: number;
  dependsOnOptionId?: string | null;
  options: ModifierOption[];
}

export interface ModifierOption {
  id: string;
  modifierGroupId: string;
  name: string;
  additionalPrice: number;
  isAvailable: boolean;
  computedAvailability?: boolean;
  manualOverrideAvailability?: boolean | null;
  maxQuantity: number;
  sortOrder: number;
  isDefault?: boolean;
  replacesDefaultComponent?: string | null;
  variantPrices?: Array<{
    id?: string;
    variantId: string;
    additionalPrice: number | string;
  }>;
}

export type MenuMoney = number | string;

export interface OrderableMenuVariant {
  id: string;
  name: string;
  price: MenuMoney;
  status?: MenuItemStatus | string;
  manualOverrideStatus?: MenuItemStatus | string | null;
  manualOverrideReason?: string | null;
  manualStockCount?: number | null;
}

export interface OrderableModifierOption {
  id: string;
  name: string;
  additionalPrice: MenuMoney;
  isAvailable: boolean;
  maxQuantity: number;
  isDefault?: boolean;
  variantPrices?: Array<{ variantId: string; additionalPrice: MenuMoney }>;
}

export interface OrderableModifierGroup {
  id: string;
  name: string;
  selectionType: ModifierSelectionType;
  minSelections: number;
  maxSelections: number | null;
  dependsOnOptionId?: string | null;
  options: OrderableModifierOption[];
}

export type OrderableMenuCategory = Omit<MenuCategory, "menuItems"> & {
  menuItems?: OrderableMenuItem[];
};

export interface OrderableMenuItem {
  id: string;
  categoryId?: string;
  name: string;
  description?: string | null;
  basePrice: MenuMoney;
  taxRate?: MenuMoney;
  imageUrl?: string | null;
  foodType?: FoodType;
  spiceLevel?: SpiceLevel | null;
  prepTimeMinutes?: number | null;
  displayMode?: "STANDARD" | "GUIDED_BUILDER";
  pricingMode?: "FIXED" | "WEIGHT_BASED" | "OPEN";
  weightUnit?: "G" | "KG" | "LB" | "OZ" | null;
  openPriceMin?: MenuMoney | null;
  openPriceMax?: MenuMoney | null;
  supportsZones?: boolean;
  zonePricingRule?: "AVERAGE" | "HIGHER" | "SUM_HALF";
  manualStockCount?: number | null;
  variants: OrderableMenuVariant[];
  modifierGroupLinks: Array<{
    sortOrder?: number;
    group: OrderableModifierGroup;
  }>;
}

export interface CustomerGroup {
  id: string;
  tenantId: string;
  name: string;
  discountPercent: number | string | null;
  discountFixed: number | string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuTag {
  id: string;
  tenantId: string;
  name: string;
  color: string | null;
}

export interface MenuAllergen {
  id: string;
  name: string;
}
