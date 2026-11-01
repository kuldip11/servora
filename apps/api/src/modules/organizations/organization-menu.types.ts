export interface OrganizationMenuInput {
  name: string;
  description?: string | null;
  status?: "DRAFT" | "PUBLISHED";
  isDefault?: boolean;
  availableChannels?: string[] | null;
  availableFulfillmentTypes?: string[] | null;
  effectiveFrom?: string | null;
  items: Array<{
    itemSku: string;
    categoryName?: string | null;
    sortOrder?: number;
  }>;
}
