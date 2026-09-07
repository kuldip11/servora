export const MENU_TABS = [
  { id: "items", label: "Items" },
  { id: "categories", label: "Categories" },
  { id: "modifiers", label: "Modifiers" },
  { id: "more", label: "More" },
] as const;

export type MenuTabId = (typeof MENU_TABS)[number]["id"];

export const MENU_CHANNELS = ["STAFF", "CUSTOMER_QR"] as const;
export const FULFILLMENT_TYPES = [
  "DINE_IN",
  "TAKEAWAY",
  "DELIVERY",
  "ONLINE",
] as const;
export const INVENTORY_UNITS = [
  "KG",
  "GRAMS",
  "LITERS",
  "ML",
  "PIECES",
  "PACKETS",
] as const;
export const WEEK_DAYS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;
export const TAG_COLORS = [
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
] as const;
export const MENU_SELECT_CLASS =
  "rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary";
export const MENU_INPUT_CLASS =
  "rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary";

import type { FoodType, MenuItemStatus, SpiceLevel } from "@pos/types";
import type { StatusTone } from "@pos/ui";

export const MENU_ITEM_STATUS_META: Record<
  MenuItemStatus,
  { label: string; tone: StatusTone }
> = {
  ACTIVE: { label: "Active", tone: "success" },
  OUT_OF_STOCK: { label: "Out of Stock", tone: "danger" },
  HIDDEN: { label: "Hidden", tone: "warning" },
  SEASONAL: { label: "Seasonal", tone: "info" },
  DISCONTINUED: { label: "Discontinued", tone: "neutral" },
};

export const MENU_ITEM_STATUS_OPTIONS: {
  value: MenuItemStatus;
  label: string;
}[] = (Object.keys(MENU_ITEM_STATUS_META) as MenuItemStatus[]).map((value) => ({
  value,
  label: MENU_ITEM_STATUS_META[value].label,
}));

export const MENU_FOOD_TYPE_OPTIONS: { value: FoodType; label: string }[] = [
  { value: "VEG", label: "Veg" },
  { value: "NON_VEG", label: "Non-Veg" },
  { value: "EGG", label: "Egg" },
];

export const MENU_SPICE_LEVEL_OPTIONS: {
  value: SpiceLevel | "";
  label: string;
}[] = [
  { value: "", label: "Not applicable" },
  { value: "NONE", label: "Not spicy" },
  { value: "MILD", label: "Mild" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HOT", label: "Hot" },
];

export const MENU_MORE_SECTIONS = [
  {
    id: "menus",
    title: "Advanced menus",
    description:
      "Create a specialized menu only when items differ by branch, channel, order type, or schedule.",
  },
  {
    id: "offers",
    title: "Offers",
    description: "Combos, promotions, happy hour, and loyalty pricing.",
  },
  {
    id: "operations",
    title: "Recipes & kitchen",
    description:
      "Ingredient deduction, sub-recipes, and kitchen station routing.",
  },
  {
    id: "tools",
    title: "Menu tools",
    description: "Import/export, reusable templates, tags, and holidays.",
  },
] as const;

export const MENU_ADVANCED_SECTION = {
  id: "advanced",
  title: "Advanced configuration",
  description:
    "Customer groups, buffet pricing, and organization-level inheritance.",
} as const;

export type MenuMoreSectionId =
  (typeof MENU_MORE_SECTIONS)[number]["id"] | typeof MENU_ADVANCED_SECTION.id;
