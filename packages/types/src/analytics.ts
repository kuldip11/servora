export interface DashboardStats {
  totalOrdersToday: number;
  revenueToday: number;
  activeOrders: number;
  lowStockAlerts: number;
  paidOrdersToday: number;
  cancelledOrdersToday: number;
  averageOrderValue: number;
  topItems: {
    name: string;
    count: number;
    revenue: number;
  }[];
  revenueByHour: {
    hour: number;
    revenue: number;
  }[];
}

export type CostSource = "RECIPE" | "MANUAL" | "UNKNOWN";

export interface CostMarginRow {
  menuItemId: string;
  menuItemName: string;
  categoryId: string;
  categoryName: string;
  variantId: string | null;
  variantName: string | null;
  price: number;
  manualCost: number | null;
  recipeCost: number | null;
  effectiveCost: number | null;
  costSource: CostSource;
  cost: number | null;
  margin: number | null;
  marginPercent: number | null;
}

export type MenuEngineeringQuadrant =
  "STAR" | "PUZZLE" | "PLOWHORSE" | "DOG" | "COST_MISSING";
export interface MenuEngineeringRow extends CostMarginRow {
  salesVolume: number;
  quadrant: MenuEngineeringQuadrant;
  recommendation: string;
}
