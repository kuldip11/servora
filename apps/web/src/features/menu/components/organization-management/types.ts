export interface OrganizationSummary {
  id: string;
  name: string;
}

export interface OrgMenu {
  id: string;
  name: string;
  status: "DRAFT" | "PUBLISHED";
  isDefault: boolean;
  organizationItems: Array<{
    id: string;
    itemSku: string;
    categoryName: string | null;
  }>;
}

export interface OrganizationTenantSummary {
  id: string;
  name: string;
  slug?: string;
  isActive?: boolean;
}
