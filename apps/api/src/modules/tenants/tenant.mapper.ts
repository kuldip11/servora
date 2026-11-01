import type {
  AvailableTenantResponse,
  TenantCreatedResponse,
  TenantResponse,
} from "@pos/contracts";
import { InternalError } from "@/core/errors";
import { tenants } from "@/db/schema";

type TenantRecord = typeof tenants.$inferSelect;

export const toTenantResponse = (
  tenant: TenantRecord | null | undefined,
): TenantResponse => {
  if (!tenant) throw new InternalError("Tenant response could not be loaded");
  return {
    id: tenant.id,
    organizationId: tenant.organizationId,
    name: tenant.name,
    displayName: tenant.displayName,
    description: tenant.description,
    cuisineTypes: tenant.cuisineTypes ?? null,
    businessModel: tenant.businessModel,
    defaultCurrency: tenant.defaultCurrency,
    defaultTimezone: tenant.defaultTimezone,
    supportEmail: tenant.supportEmail,
    supportPhone: tenant.supportPhone,
    website: tenant.website,
    logoUrl: tenant.logoUrl,
    primaryBrandImageUrl: tenant.primaryBrandImageUrl,
    plan: tenant.plan,
    isActive: tenant.isActive,
    serviceChargePercent: tenant.serviceChargePercent,
    serviceChargeTaxable: tenant.serviceChargeTaxable,
    roundingPolicy: tenant.roundingPolicy,
    defaultTaxMode: tenant.defaultTaxMode,
    defaultTaxRate: tenant.defaultTaxRate,
    dineInEnabled: tenant.dineInEnabled,
    takeawayEnabled: tenant.takeawayEnabled,
    deliveryEnabled: tenant.deliveryEnabled,
    customerQrEnabled: tenant.customerQrEnabled,
    tableManagementEnabled: tenant.tableManagementEnabled,
    kdsEnabled: tenant.kdsEnabled,
    waiterServiceEnabled: tenant.waiterServiceEnabled,
    courseSequencingEnabled: tenant.courseSequencingEnabled,
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
  };
};

export const toAvailableTenantResponse = (value: {
  membershipId: string;
  tenant: TenantRecord;
  roles: Array<{
    id: string;
    name: string;
    scope: "GLOBAL" | "TENANT" | "BRANCH";
  }>;
  branchIds: string[];
}): AvailableTenantResponse => ({
  membershipId: value.membershipId,
  tenant: toTenantResponse(value.tenant),
  roles: value.roles.map((role) => ({ ...role })),
  branchIds: [...value.branchIds],
});

export const toTenantCreatedResponse = (value: {
  tenant: TenantRecord;
  membershipId: string;
}): TenantCreatedResponse => ({
  tenant: toTenantResponse(value.tenant),
  membershipId: value.membershipId,
});
