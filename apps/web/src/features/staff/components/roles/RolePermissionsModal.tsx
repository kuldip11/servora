import {
  Button,
  FormErrorSummary,
  Modal,
  QueryErrorState,
  StaleDataBanner,
} from "@pos/ui";
import type { Permission } from "@/features/staff/services/permissions.service";
import type { Role } from "@/features/staff/services/roles.service";
import { useLocalFormApiErrors } from "@/shared/hooks/useLocalFormApiErrors";

type Props = {
  role: Role | null;
  groupedPermissions: [string, Permission[]][];
  selectedPermissionIds: string[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  hasData: boolean;
  isSaving: boolean;
  isDirty: boolean;
  onRetry: () => void;
  onTogglePermission: (permissionId: string, checked: boolean) => void;
  onClose: () => void;
  onSave: (onError: (error: unknown) => void) => void;
};

export const RolePermissionsModal = ({
  role,
  groupedPermissions,
  selectedPermissionIds,
  isLoading,
  isFetching,
  isError,
  hasData,
  isSaving,
  isDirty,
  onRetry,
  onTogglePermission,
  onClose,
  onSave,
}: Props) => {
  const formErrors = useLocalFormApiErrors();
  const close = () => {
    formErrors.clearErrors();
    onClose();
  };

  return (
    <Modal
      open={Boolean(role)}
      onClose={close}
      title={role ? `Permissions — ${role.name}` : "Permissions"}
    >
      <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
        <FormErrorSummary messages={formErrors.formErrorMessages} />
        {isError && !hasData ? (
          <QueryErrorState
            title="Unable to load role permissions"
            description="Permission catalog or current assignments could not be loaded. Retry before editing this role."
            onRetry={onRetry}
            isRetrying={isFetching}
          />
        ) : isLoading ? (
          <p className="text-sm text-text-secondary">Loading permissions…</p>
        ) : (
          <>
            {isError && hasData ? (
              <StaleDataBanner
                message="Permission refresh failed. Showing cached assignments; saving is disabled until the latest permissions are loaded."
                onRetry={onRetry}
                isRetrying={isFetching}
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
                        checked={selectedPermissionIds.includes(permission.id)}
                        onChange={(event) =>
                          onTogglePermission(
                            permission.id,
                            event.target.checked,
                          )
                        }
                      />
                      <span>
                        <span className="block text-sm font-medium text-text-primary">
                          {permission.key}
                        </span>
                        {permission.description ? (
                          <span className="block text-xs text-text-secondary">
                            {permission.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </>
        )}

        <div className="sticky bottom-0 flex justify-end gap-2 bg-surface pt-2">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            loading={isSaving}
            disabled={!role || isLoading || isError || !isDirty || isSaving}
            onClick={() => {
              formErrors.clearErrors();
              if (!role || !isDirty) return;
              onSave((error) =>
                formErrors.handleApiError(
                  error,
                  [],
                  "Failed to update permissions",
                ),
              );
            }}
          >
            Save Permissions
          </Button>
        </div>
      </div>
    </Modal>
  );
};
