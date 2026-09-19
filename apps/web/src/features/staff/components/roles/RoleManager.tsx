import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Button,
  Card,
  FormErrorSummary,
  Input,
  Modal,
  QueryErrorState,
  Select,
  StaleDataBanner,
  StatusBadge,
} from "@pos/ui";
import { KeyRound, Plus, Shield, Trash2 } from "lucide-react";
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
import { useLocalFormApiErrors } from "@/shared/hooks/useLocalFormApiErrors";
import { validateRoleForm } from "@/features/staff/helpers/role-form";

export const RoleManager = ({
  roles,
  canManage,
  canManagePermissions,
}: {
  roles: Role[];
  canManage: boolean;
  canManagePermissions: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<"TENANT" | "BRANCH">("BRANCH");
  const [permissionRole, setPermissionRole] = useState<Role | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>(
    [],
  );
  const [initialPermissionIds, setInitialPermissionIds] = useState<string[]>(
    [],
  );
  const roleFormErrors = useLocalFormApiErrors();
  const permissionFormErrors = useLocalFormApiErrors();
  const roleClientErrors = useMemo(
    () => validateRoleForm({ name, description }),
    [description, name],
  );

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: roleKeys.list() });
  const createRole = useMutation({
    mutationFn: rolesService.create,
    onSuccess: () => {
      refresh();
      notifySuccess("Role created");
      setOpen(false);
      setName("");
      setDescription("");
      setScope("BRANCH");
    },
  });
  const archiveRole = useMutation({
    mutationFn: rolesService.archive,
    onSuccess: () => {
      refresh();
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
    for (const permission of permissionsQuery.data?.catalog ?? [])
      groups.set(permission.module, [
        ...(groups.get(permission.module) ?? []),
        permission,
      ]);
    return [...groups.entries()];
  }, [permissionsQuery.data?.catalog]);

  return (
    <Card className="mt-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Roles</h2>
            <p className="text-sm text-text-secondary">
              System roles and franchise-specific roles available to staff.
            </p>
          </div>
          {canManage && (
            <Button
              onClick={() => {
                roleFormErrors.clearErrors();
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Create Role
            </Button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-medium text-text-primary">
                    {role.name}
                  </span>
                  <StatusBadge
                    tone={role.scope === "BRANCH" ? "info" : "neutral"}
                    dot={false}
                    label={role.scope}
                  />
                  {role.isSystem && (
                    <StatusBadge tone="neutral" dot={false} label="SYSTEM" />
                  )}
                </div>
                {role.description && (
                  <p className="mt-2 text-sm text-text-secondary">
                    {role.description}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {canManagePermissions && !role.isSystem && (
                  <button
                    type="button"
                    className="rounded-md p-2 text-text-secondary hover:bg-primary-surface hover:text-primary"
                    aria-label={`Manage permissions for ${role.name}`}
                    onClick={() => {
                      permissionFormErrors.clearErrors();
                      setPermissionRole(role);
                    }}
                  >
                    <KeyRound className="h-4 w-4" />
                  </button>
                )}
                {canManage && !role.isSystem && (
                  <button
                    type="button"
                    className="rounded-md p-2 text-text-secondary hover:bg-danger-surface hover:text-danger"
                    aria-label={`Archive ${role.name}`}
                    onClick={() => {
                      if (confirm(`Archive role ${role.name}?`))
                        archiveRole.mutate(role.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create Role">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            roleFormErrors.clearErrors();
            if (Object.keys(roleClientErrors).length) return;
            createRole.mutate(
              {
                name: name.trim(),
                ...(description.trim()
                  ? { description: description.trim() }
                  : {}),
                scope,
              },
              {
                onError: (error) =>
                  roleFormErrors.handleApiError(
                    error,
                    ["name", "description", "scope"],
                    "Failed to create role",
                  ),
              },
            );
          }}
        >
          <FormErrorSummary messages={roleFormErrors.formErrorMessages} />
          <Input
            label="Role name"
            value={name}
            error={roleFormErrors.fieldErrors.name ?? roleClientErrors.name}
            onChange={(event) => {
              roleFormErrors.clearFieldError("name");
              setName(event.target.value);
            }}
            required
            maxLength={80}
            placeholder="e.g. Shift Lead"
          />
          <Input
            label="Description"
            value={description}
            error={
              roleFormErrors.fieldErrors.description ??
              roleClientErrors.description
            }
            onChange={(event) => {
              roleFormErrors.clearFieldError("description");
              setDescription(event.target.value);
            }}
            maxLength={500}
            placeholder="What this role is responsible for"
          />
          <Select
            label="Scope"
            value={scope}
            error={roleFormErrors.fieldErrors.scope}
            onChange={(event) => {
              roleFormErrors.clearFieldError("scope");
              setScope(event.target.value as "TENANT" | "BRANCH");
            }}
            options={[
              {
                value: "BRANCH",
                label: "Branch — assigned to selected branches",
              },
              {
                value: "TENANT",
                label: "Franchise — access across the franchise",
              },
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createRole.isPending}
              disabled={
                createRole.isPending || Object.keys(roleClientErrors).length > 0
              }
            >
              Create Role
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(permissionRole)}
        onClose={() => {
          permissionFormErrors.clearErrors();
          setPermissionRole(null);
        }}
        title={
          permissionRole
            ? `Permissions — ${permissionRole.name}`
            : "Permissions"
        }
      >
        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
          <FormErrorSummary messages={permissionFormErrors.formErrorMessages} />
          {permissionsQuery.isError && !permissionsQuery.data ? (
            <QueryErrorState
              title="Unable to load role permissions"
              description="Permission catalog or current assignments could not be loaded. Retry before editing this role."
              onRetry={() => void permissionsQuery.refetch()}
              isRetrying={permissionsQuery.isFetching}
            />
          ) : permissionsQuery.isLoading ? (
            <p className="text-sm text-text-secondary">Loading permissions…</p>
          ) : (
            <>
              {permissionsQuery.isError && permissionsQuery.data ? (
                <StaleDataBanner
                  message="Permission refresh failed. Showing cached assignments; saving is disabled until the latest permissions are loaded."
                  onRetry={() => void permissionsQuery.refetch()}
                  isRetrying={permissionsQuery.isFetching}
                />
              ) : null}
              {groupedPermissions.map(([module, permissions]) => (
                <fieldset
                  key={module}
                  className="rounded-lg border border-border p-3"
                >
                  <legend className="px-1 text-sm font-semibold capitalize text-text-primary">
                    {module}
                  </legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {permissions.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-surface-secondary"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 accent-primary"
                          checked={selectedPermissionIds.includes(
                            permission.id,
                          )}
                          onChange={(event) =>
                            setSelectedPermissionIds((current) =>
                              event.target.checked
                                ? [...current, permission.id]
                                : current.filter((id) => id !== permission.id),
                            )
                          }
                        />
                        <span>
                          <span className="block text-sm font-medium text-text-primary">
                            {permission.key}
                          </span>
                          {permission.description && (
                            <span className="block text-xs text-text-secondary">
                              {permission.description}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </>
          )}
          <div className="sticky bottom-0 flex justify-end gap-2 bg-surface pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                permissionFormErrors.clearErrors();
                setPermissionRole(null);
              }}
            >
              Cancel
            </Button>
            <Button
              loading={savePermissions.isPending}
              disabled={
                !permissionRole ||
                permissionsQuery.isLoading ||
                permissionsQuery.isError ||
                !permissionsDirty ||
                savePermissions.isPending
              }
              onClick={() => {
                if (!permissionRole) return;
                permissionFormErrors.clearErrors();
                if (!permissionsDirty) return;
                savePermissions.mutate(
                  {
                    roleId: permissionRole.id,
                    permissionIds: selectedPermissionIds,
                  },
                  {
                    onError: (error) =>
                      permissionFormErrors.handleApiError(
                        error,
                        [],
                        "Failed to update permissions",
                      ),
                  },
                );
              }}
            >
              Save Permissions
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
};
