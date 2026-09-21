import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card } from "@pos/ui";
import {
  rolesService,
  type Role,
} from "@/features/staff/services/roles.service";
import {
  permissionsService,
  type Permission,
} from "@/features/staff/services/permissions.service";
import { queryClient } from "@/shared/lib/query-client";
import { roleKeys } from "@/features/staff/query-keys";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { CreateRoleModal, type CreateRolePayload } from "./CreateRoleModal";
import { RoleList } from "./RoleList";
import { RolePermissionsModal } from "./RolePermissionsModal";

export const RoleManager = ({
  roles,
  canManage,
  canManagePermissions,
}: {
  roles: Role[];
  canManage: boolean;
  canManagePermissions: boolean;
}) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [permissionRole, setPermissionRole] = useState<Role | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>(
    [],
  );
  const [initialPermissionIds, setInitialPermissionIds] = useState<string[]>(
    [],
  );

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: roleKeys.list() });
  const createRole = useMutation({
    mutationFn: rolesService.create,
    onSuccess: () => {
      void refresh();
      notifySuccess("Role created");
      setCreateOpen(false);
    },
  });
  const archiveRole = useMutation({
    mutationFn: rolesService.archive,
    onSuccess: () => {
      void refresh();
      notifySuccess("Role archived");
    },
    onError: (error) => notifyError(error, "Failed to archive role"),
  });
  const savePermissions = useMutation({
    mutationFn: ({
      roleId,
      permissionIds,
    }: {
      roleId: string;
      permissionIds: string[];
    }) => permissionsService.setForRole(roleId, permissionIds),
    onSuccess: () => {
      notifySuccess("Role permissions updated");
      setPermissionRole(null);
    },
  });

  const permissionsQuery = useQuery({
    queryKey: ["staff", "roles", permissionRole?.id, "permissions"],
    enabled: Boolean(permissionRole),
    queryFn: async () => {
      const [catalog, assigned] = await Promise.all([
        permissionsService.list(),
        permissionsService.forRole(permissionRole!.id),
      ]);
      return { catalog, assigned };
    },
  });

  useEffect(() => {
    if (!permissionRole || !permissionsQuery.data) return;
    const assignedIds = permissionsQuery.data.assigned
      .map((permission) => permission.id)
      .sort();
    setSelectedPermissionIds(assignedIds);
    setInitialPermissionIds(assignedIds);
  }, [permissionRole, permissionsQuery.data]);

  const permissionsDirty = useMemo(
    () =>
      [...selectedPermissionIds].sort().join("|") !==
      [...initialPermissionIds].sort().join("|"),
    [initialPermissionIds, selectedPermissionIds],
  );

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const permission of permissionsQuery.data?.catalog ?? []) {
      groups.set(permission.module, [
        ...(groups.get(permission.module) ?? []),
        permission,
      ]);
    }
    return [...groups.entries()];
  }, [permissionsQuery.data?.catalog]);

  const handleCreateRole = (
    payload: CreateRolePayload,
    onError: (error: unknown) => void,
  ) => createRole.mutate(payload, { onError });

  return (
    <Card className="mt-6">
      <RoleList
        roles={roles}
        canManage={canManage}
        canManagePermissions={canManagePermissions}
        onCreate={() => setCreateOpen(true)}
        onManagePermissions={setPermissionRole}
        onArchive={(role) => {
          if (confirm(`Archive role ${role.name}?`))
            archiveRole.mutate(role.id);
        }}
      />

      <CreateRoleModal
        open={createOpen}
        isSaving={createRole.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateRole}
      />

      <RolePermissionsModal
        role={permissionRole}
        groupedPermissions={groupedPermissions}
        selectedPermissionIds={selectedPermissionIds}
        isLoading={permissionsQuery.isLoading}
        isFetching={permissionsQuery.isFetching}
        isError={permissionsQuery.isError}
        hasData={Boolean(permissionsQuery.data)}
        isSaving={savePermissions.isPending}
        isDirty={permissionsDirty}
        onRetry={() => void permissionsQuery.refetch()}
        onTogglePermission={(permissionId, checked) =>
          setSelectedPermissionIds((current) =>
            checked
              ? [...current, permissionId]
              : current.filter((id) => id !== permissionId),
          )
        }
        onClose={() => setPermissionRole(null)}
        onSave={(onError) => {
          if (!permissionRole) return;
          savePermissions.mutate(
            { roleId: permissionRole.id, permissionIds: selectedPermissionIds },
            { onError },
          );
        }}
      />
    </Card>
  );
};
