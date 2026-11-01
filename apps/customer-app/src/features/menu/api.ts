import { request } from "@/shared/api/client";
import type {
  FoodType,
  MenuMoney,
  OrderableMenuItem,
  SpiceLevel,
} from "@pos/types";

export interface CustomerMenuItem extends OrderableMenuItem {
  categoryId: string;
  description: string | null;
  taxRate: MenuMoney;
  imageUrl: string | null;
  foodType: FoodType;
  spiceLevel: SpiceLevel | null;
  prepTimeMinutes: number | null;
  tagLinks: Array<{ tag: { name: string } }>;
  images: Array<{ url: string; sortOrder: number }>;
}

export type CustomerCombo = {
  id: string;
  name: string;
  description: string | null;
  pricePolicy: "FIXED" | "PERCENT_OFF_SUM";
  fixedPrice: string | null;
  percentOff: string | null;
  slots: Array<{
    id: string;
    name: string;
    minSelections: number;
    maxSelections: number;
    sortOrder: number;
    options: Array<{
      id: string;
      menuItemId: string;
      variantId: string | null;
      upcharge: string;
    }>;
  }>;
};

export type CustomerMenu = {
  restaurant: { id: string; name: string; address: string };
  mode: "DINE_IN" | "TAKEAWAY";
  table: { id: string; name: string; section: string | null } | null;
  categories: Array<{ id: string; name: string; sortOrder: number }>;
  combos: CustomerCombo[];
  items: CustomerMenuItem[];
};

export const getCustomerMenu = (sessionToken: string, signal?: AbortSignal) => {
  return request<CustomerMenu>(
    "/api/customer/menu",
    signal ? { signal } : undefined,
    sessionToken,
  );
};
