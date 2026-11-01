import type {
  OrganizationCreatedResponse,
  OrganizationMenuResponse,
  OrganizationResponse,
} from "@pos/contracts";
import { InternalError } from "@/core/errors";
import { menus, organizations } from "@/db/schema";

type OrganizationRecord = typeof organizations.$inferSelect;
type MenuRecord = typeof menus.$inferSelect & {
  organizationItems?: Array<{
    id: string;
    menuId: string;
    itemSku: string;
    categoryName: string | null;
    sortOrder: number;
    createdAt: Date;
  }>;
};

export const toOrganizationResponse = (
  organization: OrganizationRecord | null | undefined,
): OrganizationResponse => {
  if (!organization)
    throw new InternalError("Organization response could not be loaded");
  return {
    id: organization.id,
    name: organization.name,
    businessType: organization.businessType,
    country: organization.country,
    timezone: organization.timezone,
    currency: organization.currency,
    primaryContactName: organization.primaryContactName,
    businessEmail: organization.businessEmail,
    businessPhone: organization.businessPhone,
    addressLine1: organization.addressLine1,
    addressLine2: organization.addressLine2,
    city: organization.city,
    stateProvince: organization.stateProvince,
    postalCode: organization.postalCode,
    legalName: organization.legalName,
    website: organization.website,
    taxRegistrationNumber: organization.taxRegistrationNumber,
    gstin: organization.gstin,
    pan: organization.pan,
    companyRegistrationNumber: organization.companyRegistrationNumber,
    logoUrl: organization.logoUrl,
    isActive: organization.isActive,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  };
};

export const toOrganizationCreatedResponse = (value: {
  organization: OrganizationRecord;
  membershipId: string;
}): OrganizationCreatedResponse => ({
  organization: toOrganizationResponse(value.organization),
  membershipId: value.membershipId,
});

export const toOrganizationMenuResponse = (
  menu: MenuRecord | null | undefined,
): OrganizationMenuResponse => {
  if (!menu)
    throw new InternalError("Organization menu response could not be loaded");
  return {
    id: menu.id,
    tenantId: menu.tenantId,
    organizationId: menu.organizationId,
    name: menu.name,
    description: menu.description,
    status: menu.status,
    isDefault: menu.isDefault,
    availableChannels: (menu.availableChannels ??
      null) as OrganizationMenuResponse["availableChannels"],
    availableFulfillmentTypes: (menu.availableFulfillmentTypes ??
      null) as OrganizationMenuResponse["availableFulfillmentTypes"],
    availableBranchIds: menu.availableBranchIds ?? null,
    effectiveFrom: menu.effectiveFrom?.toISOString() ?? null,
    createdAt: menu.createdAt.toISOString(),
    updatedAt: menu.updatedAt.toISOString(),
    organizationItems: (menu.organizationItems ?? []).map((item) => ({
      id: item.id,
      menuId: item.menuId,
      itemSku: item.itemSku,
      categoryName: item.categoryName,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt.toISOString(),
    })),
  };
};
