import { Button, StatusBadge } from "@pos/ui";
import { KeyRound, Plus, Shield, Trash2 } from "lucide-react";
import type { Role } from "@/features/staff/services/roles.service";

type Props = {
  roles: Role[];
  canManage: boolean;
  canManagePermissions: boolean;
  onCreate: () => void;
  onManagePermissions: (role: Role) => void;
  onArchive: (role: Role) => void;
};

export const RoleList = ({
  roles,
  canManage,
  canManagePermissions,
  onCreate,
  onManagePermissions,
  onArchive,
}: Props) => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Roles</h2>
        <p className="text-sm text-text-secondary">
          System roles and franchise-specific roles available to staff.
        </p>
      </div>
      {canManage ? (
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Create Role
        </Button>
      ) : null}
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
              <span className="font-medium text-text-primary">{role.name}</span>
              <StatusBadge
                tone={role.scope === "BRANCH" ? "info" : "neutral"}
                dot={false}
                label={role.scope}
              />
              {role.isSystem ? (
                <StatusBadge tone="neutral" dot={false} label="SYSTEM" />
              ) : null}
            </div>
            {role.description ? (
              <p className="mt-2 text-sm text-text-secondary">
                {role.description}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {canManagePermissions && !role.isSystem ? (
              <button
                type="button"
                className="rounded-md p-2 text-text-secondary hover:bg-primary-surface hover:text-primary"
                aria-label={`Manage permissions for ${role.name}`}
                onClick={() => onManagePermissions(role)}
              >
                <KeyRound className="h-4 w-4" />
              </button>
            ) : null}
            {canManage && !role.isSystem ? (
              <button
                type="button"
                className="rounded-md p-2 text-text-secondary hover:bg-danger-surface hover:text-danger"
                aria-label={`Archive ${role.name}`}
                onClick={() => onArchive(role)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  </div>
);
