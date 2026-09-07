export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type SystemRoleName =
  | "OWNER"
  | "FRANCHISE_ADMIN"
  | "MANAGER"
  | "CHEF"
  | "WAITER"
  | "CASHIER"
  | "INVENTORY_MANAGER"
  | "RECEPTIONIST"
  | "ACCOUNTANT";

export type RoleName = SystemRoleName | (string & {});

export interface User {
  id: string;
  tenantId: string | null;
  branchId: string | null;
  firstName: string;
  lastName: string;
  displayName?: string | null;
  email: string;
  phone?: string | null;
  profileImageUrl?: string | null;
  status: UserStatus;
  roles: Role[];
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: RoleName;
  description: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  key: string;
  module: string;
}

export type RoundingPolicy = "NONE" | "NEAREST_1" | "NEAREST_5" | "NEAREST_10";
export type TaxMode = "INCLUSIVE" | "EXCLUSIVE";

export interface Tenant {
  id: string;
  name: string;
  displayName?: string | null;
  description?: string | null;
  cuisineTypes?: string[] | null;
  businessModel?: string | null;
  defaultCurrency?: string | null;
  defaultTimezone?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  primaryBrandImageUrl?: string | null;
  plan: string;
  serviceChargePercent?: string | null;
  serviceChargeTaxable?: boolean;
  roundingPolicy?: RoundingPolicy;
  defaultTaxMode?: TaxMode;
  defaultTaxRate?: string | null;
  dineInEnabled?: boolean;
  takeawayEnabled?: boolean;
  deliveryEnabled?: boolean;
  customerQrEnabled?: boolean;
  tableManagementEnabled?: boolean;
  kdsEnabled?: boolean;
  waiterServiceEnabled?: boolean;
  courseSequencingEnabled?: boolean;
  isActive?: boolean;
  organizationId?: string;
  createdAt: string;
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  timezone: string;
  currency: string;
  address: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone: string;
  managerName?: string | null;
  email?: string | null;
  openingTime?: string | null;
  closingTime?: string | null;
  weeklyOperatingDays?: string[] | null;
  taxOverride?: string | null;
  serviceChargeOverride?: string | null;
  invoicePrefix?: string | null;
  receiptFooter?: string | null;
  inventoryTrackingEnabled?: boolean;
  negativeStockPolicy?: "BLOCK" | "ALLOW" | "WARN";
  isActive: boolean;
  dineInEnabled: boolean;
  takeawayEnabled: boolean;
  deliveryEnabled: boolean;
  onlineEnabled: boolean;
  tablesEnabled: boolean;
  customerQrEnabled?: boolean;
  kdsEnabled?: boolean;
  waiterAppEnabled?: boolean;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  isActive: boolean;
  businessType?: string | null;
  country?: string | null;
  timezone?: string | null;
  currency?: string | null;
  primaryContactName?: string | null;
  businessEmail?: string | null;
  businessPhone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  legalName?: string | null;
  website?: string | null;
  taxRegistrationNumber?: string | null;
  gstin?: string | null;
  pan?: string | null;
  companyRegistrationNumber?: string | null;
  logoUrl?: string | null;
}

export interface AvailableMembership {
  membershipId: string;

  tenant: Pick<Tenant, "id" | "name"> & Partial<Omit<Tenant, "id" | "name">>;
  roles: Array<{
    id: string;
    name: RoleName;
    scope: "GLOBAL" | "TENANT" | "BRANCH";
  }>;
  branches: Array<
    Pick<Branch, "id" | "name" | "address" | "isActive" | "tablesEnabled"> &
      Partial<
        Omit<Branch, "id" | "name" | "address" | "isActive" | "tablesEnabled">
      >
  >;
}
