import { voidDomainRequest } from "./shared";
import type {
  CreateRoleRequest,
  CreateStaffRequest,
  PermissionResponseItem,
  RoleResponseItem,
  RoleWithPermissionsResponse,
  SetRolePermissionsRequest,
  StaffListQuery,
  StaffMemberResponse,
  UpdateRoleRequest,
  UpdateStaffRequest,
} from "@pos/contracts";
import {
  getDomainData,
  getPaginatedDomainData,
  patchDomainData,
  postDomainData,
  putDomainData,
  type DomainHttpClient,
  type PaginatedResult,
} from "./shared";

export type PermissionDto = PermissionResponseItem;
export type RoleDto = RoleResponseItem;
export type CreateRoleInput = CreateRoleRequest;
export type StaffRowDto = StaffMemberResponse;
export type AddStaffInput = CreateStaffRequest;
export type UpdateStaffInput = UpdateStaffRequest;
export type StaffListFilters = StaffListQuery;

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
    addStaff(input: AddStaffInput): Promise<StaffRowDto> {
      return postDomainData<StaffRowDto>(client, "/staff", input);
    },
    removeStaff(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/staff/${id}`));
    },
    updateStaffStatus(
      id: string,
      status: NonNullable<UpdateStaffRequest["status"]>,
    ): Promise<StaffRowDto> {
      return patchDomainData<StaffRowDto>(client, `/staff/${id}`, { status });
    },
    updateStaff(id: string, input: UpdateStaffInput): Promise<StaffRowDto> {
      return patchDomainData<StaffRowDto>(client, `/staff/${id}`, input);
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
    updateRole(id: string, input: UpdateRoleRequest): Promise<RoleDto> {
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
    ): Promise<RoleWithPermissionsResponse> {
      const input: SetRolePermissionsRequest = { permissionIds };
      return putDomainData<RoleWithPermissionsResponse>(
        client,
        `/roles/${roleId}/permissions`,
        input,
      );
    },
  };
};
