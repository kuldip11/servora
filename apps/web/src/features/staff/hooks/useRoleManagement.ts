import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { roleKeys } from "../query-keys";
import { rolePermissionsQuery } from "../query-options";
import { permissionsService } from "../services/permissions.service";
import { rolesService } from "../services/roles.service";

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rolesService.create,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: roleKeys.list() }),
  });
};

export const useArchiveRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rolesService.archive,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: roleKeys.list() }),
  });
};

export const useRolePermissions = (roleId: string | null) =>
  useQuery(rolePermissionsQuery(roleId));

export const useSaveRolePermissions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      roleId,
      permissionIds,
    }: {
      roleId: string;
      permissionIds: string[];
    }) => permissionsService.setForRole(roleId, permissionIds),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({
        queryKey: roleKeys.permissions(variables.roleId),
      }),
  });
};
