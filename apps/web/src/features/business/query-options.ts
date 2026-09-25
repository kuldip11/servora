import { queryOptions } from "@tanstack/react-query";
import type { OrganizationSummary, Tenant } from "@pos/types";
import { businessKeys } from "./query-keys";
import { businessService } from "./services/business.service";

export type BusinessData = {
  organizations: OrganizationSummary[];
  franchises: Tenant[];
};

export const businessHierarchyQuery = () =>
  queryOptions({
    queryKey: businessKeys.hierarchy(),
    queryFn: async (): Promise<BusinessData> => {
      const organizations = await businessService.organizations();
      const franchiseGroups = await Promise.all(
        organizations.map((organization) =>
          businessService.franchises(organization.id),
        ),
      );
      return { organizations, franchises: franchiseGroups.flat() };
    },
  });
