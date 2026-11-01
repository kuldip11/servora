import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { staffService } from "./services/staff.service";
import { rolesService } from "./services/roles.service";
import { permissionsService } from "./services/permissions.service";
import { staffKeys, roleKeys } from "./query-keys";
import { queryFreshness } from "@/shared/lib/query-policy";

import type { StaffListFilters } from "@pos/api-client";

export const staffListQuery = (filters: StaffListFilters = {}) => {
  const hasFilters = Object.keys(filters).length > 0;
  return queryOptions({
    queryKey: hasFilters ? [...staffKeys.list(), filters] : staffKeys.list(),
    queryFn: ({ signal }) => staffService.list(filters, signal),
    placeholderData: keepPreviousData,
    staleTime: queryFreshness.normal,
  });
};

export const rolesListQuery = () => {
  return queryOptions({
    queryKey: roleKeys.list(),
    queryFn: ({ signal }) => rolesService.list(signal),
    staleTime: queryFreshness.reference,
  });
};

export const rolePermissionsQuery = (roleId: string | null) =>
  queryOptions({
    queryKey: roleKeys.permissions(roleId),
    enabled: Boolean(roleId),
    queryFn: async ({ signal }) => {
      if (!roleId) return { catalog: [], assigned: [] };
      const [catalog, assigned] = await Promise.all([
        permissionsService.list(signal),
        permissionsService.forRole(roleId, signal),
      ]);
      return { catalog, assigned };
    },
    staleTime: queryFreshness.reference,
  });
