import { useEffect, useMemo, useState } from "react";
import { Card } from "@pos/ui";
import type { Role } from "@/features/staff/services/roles.service";
import type { Permission } from "@/features/staff/services/permissions.service";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import {
  useArchiveRole,
  useCreateRole,
  useRolePermissions,
  useSaveRolePermissions,
} from "@/features/staff/hooks/useRoleManagement";
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

  const createRole = useCreateRole();
  const archiveRole = useArchiveRole();
  const savePermissions = useSaveRolePermissions();
  const permissionsQuery = useRolePermissions(permissionRole?.id ?? null);

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
  ) =>
    createRole.mutate(payload, {
      onSuccess: () => {
        notifySuccess("Role created");
        setCreateOpen(false);
      },
      onError,
    });

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
            archiveRole.mutate(role.id, {
              onSuccess: () => notifySuccess("Role archived"),
              onError: (error) => notifyError(error, "Failed to archive role"),
            });
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
            {
              onSuccess: () => {
                notifySuccess("Role permissions updated");
                setPermissionRole(null);
              },
              onError,
            },
          );
        }}
      />
    </Card>
  );
};
