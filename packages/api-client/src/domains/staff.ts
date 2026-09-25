import { voidDomainRequest } from "./shared";
import {
  getDomainData,
  getPaginatedDomainData,
  patchDomainData,
  postDomainData,
  type DomainHttpClient,
  type PaginatedResult,
} from "./shared";

export interface PermissionDto {
  id: string;
  key: string;
  module: string;
  description?: string | null;
}

export interface RoleDto {
  id: string;
  name: string;
  description?: string | null;
  scope: "GLOBAL" | "TENANT" | "BRANCH";
  tenantId?: string | null;
  isSystem?: boolean;
  isActive?: boolean;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  scope: "TENANT" | "BRANCH";
}

export interface StaffRowDto {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  status: string;
  assignedBranches?: { id?: string; name?: string }[];
  roles?: { name?: string; scope?: string }[];
}

export interface AddStaffInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleId: string;
  branchIds: string[];
}

export interface UpdateStaffInput {
  firstName?: string;
  lastName?: string;
  roleId?: string;
  branchIds?: string[];
}

export interface StaffListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const createStaffApi = (client: DomainHttpClient) => {
  return {
    listStaff(
      filters: StaffListFilters = {},
      signal?: AbortSignal,
    ): Promise<PaginatedResult<StaffRowDto>> {
      const params: Record<string, string> = {
        page: String(filters.page ?? 1),
        limit: String(filters.limit ?? 25),
      };
      if (filters.search) params["search"] = filters.search;
      if (filters.status) params["status"] = filters.status;
      return getPaginatedDomainData<StaffRowDto>(client, "/staff", {
        params,
        ...(signal ? { signal } : {}),
      });
    },
    addStaff(input: AddStaffInput): Promise<void> {
      return voidDomainRequest(client.post("/staff", input));
    },
    removeStaff(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/staff/${id}`));
    },
    updateStaffStatus(id: string, status: string): Promise<void> {
      return voidDomainRequest(client.patch(`/staff/${id}`, { status }));
    },
    updateStaff(id: string, input: UpdateStaffInput): Promise<void> {
      return voidDomainRequest(client.patch(`/staff/${id}`, input));
    },
    listRoles(signal?: AbortSignal): Promise<RoleDto[]> {
      return getDomainData<RoleDto[]>(
        client,
        "/roles",
        signal ? { signal } : undefined,
      );
    },
    createRole(input: CreateRoleInput): Promise<RoleDto> {
      return postDomainData<RoleDto>(client, "/roles", input);
    },
    updateRole(
      id: string,
      input: Pick<CreateRoleInput, "name" | "description">,
    ): Promise<RoleDto> {
      return patchDomainData<RoleDto>(client, `/roles/${id}`, input);
    },
    archiveRole(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/roles/${id}`));
    },
    listPermissions(signal?: AbortSignal): Promise<PermissionDto[]> {
      return getDomainData<PermissionDto[]>(
        client,
        "/permissions",
        signal ? { signal } : undefined,
      );
    },
    permissionsForRole(
      roleId: string,
      signal?: AbortSignal,
    ): Promise<PermissionDto[]> {
      return getDomainData<PermissionDto[]>(
        client,
        `/roles/${roleId}/permissions`,
        signal ? { signal } : undefined,
      );
    },
    setPermissionsForRole(
      roleId: string,
      permissionIds: string[],
    ): Promise<void> {
      return voidDomainRequest(
        client.put(`/roles/${roleId}/permissions`, { permissionIds }),
      );
    },
  };
};
