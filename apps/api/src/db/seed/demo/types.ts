import type { Database } from "@/db";
export type SeedDatabase = Pick<
  Database,
  "insert" | "select" | "selectDistinct" | "delete" | "update" | "execute"
>;
export type DemoPreset = "small" | "demo";

export type BrandSeed = {
  key: string;
  name: string;
  businessModel: string;
  cuisineTypes: string[];
  categoryNames: string[];
  itemRoots: string[];
  branchCount: number;
  menuItemCount: number;
};

export type DemoConfig = {
  preset: DemoPreset;
  referenceTime: Date;
  historyDays: number;
  ordersPerBranchPerDay: number;
  customersPerTenant: number;
  tablesPerBranch: number;
  inventoryItemsPerBranch: number;
  staffPerBranch: number;
  brands: BrandSeed[];
  estimatedSizeMb: number;
};

export type SeedContext = {
  organizationId: string;
  ownerUserId: string;
  tenantIds: Record<string, string>;
  branchIds: Record<string, string[]>;
  branchTenantIds: Record<string, string>;
  staffUserIdsByBranch: Record<string, string[]>;
};
