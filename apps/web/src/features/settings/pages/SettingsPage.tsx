import { useAuthStore } from "@/store/auth";
import { useState } from "react";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import {
  Button,
  Card,
  FormErrorSummary,
  Grid,
  Input,
  Page,
  PageHeader,
  QueryErrorState,
  Spinner,
  StaleDataBanner,
  StatusBadge,
  ThemeSwitcher,
} from "@pos/ui";
import { Building2, Shield, Palette } from "lucide-react";
import { usePermissions } from "@/shared/auth/permissions";
import { useCancellationReasons } from "@/features/orders";
import { PricingSettingsCard } from "@/features/settings/components/PricingSettingsCard";
import { KitchenOperationsSettingsCard } from "@/features/settings/components/KitchenOperationsSettingsCard";
import { ApprovalThresholdSettingsCard } from "@/features/settings/components/ApprovalThresholdSettingsCard";
import { useLocalFormApiErrors } from "@/shared/hooks/useLocalFormApiErrors";
import { validateCancellationReason } from "@/features/settings/helpers/settings-validation";
import { useCancellationReasonMutation } from "@/features/settings/hooks/useCancellationReasonMutation";

export const SettingsPage = () => {
  const { user, franchiseId } = useAuthStore();
  const { has } = usePermissions();
  const cancellationReasonsQuery = useCancellationReasons(
    false,
    has("settings:update") && has("orders:read"),
  );
  const cancellationReasons = cancellationReasonsQuery.data ?? [];
  const [newCancellationReason, setNewCancellationReason] = useState("");
  const cancellationFormErrors = useLocalFormApiErrors();
  const cancellationReasonError = validateCancellationReason(
    newCancellationReason,
  );
  const reasonMutation = useCancellationReasonMutation();

  return (
    <Page>
      <PageHeader
        title="Settings"
        description="Manage your restaurant and account settings"
      />

      <Grid columns={{ base: 1, lg: 2 }} gap="lg">
        {franchiseId && has("tenant:update") && (
          <PricingSettingsCard tenantId={franchiseId} />
        )}
        {franchiseId && has("tenant:update") && (
          <KitchenOperationsSettingsCard tenantId={franchiseId} />
        )}
        {has("settings:update") && has("orders:update") && (
          <ApprovalThresholdSettingsCard />
        )}

        {has("settings:update") && has("orders:read") && (
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-base font-semibold text-text-primary">
                Cancellation reasons
              </h2>
            </div>
            {cancellationReasonsQuery.isLoading &&
            !cancellationReasonsQuery.data ? (
              <div className="flex min-h-24 items-center justify-center">
                <Spinner className="h-5 w-5" />
              </div>
            ) : cancellationReasonsQuery.isError &&
              !cancellationReasonsQuery.data ? (
              <QueryErrorState
                title="Unable to load cancellation reasons"
                description="Cancellation reasons could not be loaded. Retry before changing the configured reasons."
                onRetry={() => void cancellationReasonsQuery.refetch()}
                isRetrying={cancellationReasonsQuery.isFetching}
              />
            ) : (
              <>
                {cancellationReasonsQuery.isError &&
                cancellationReasonsQuery.data ? (
                  <StaleDataBanner
                    message="Cancellation reasons could not be refreshed. Showing the latest cached list."
                    onRetry={() => void cancellationReasonsQuery.refetch()}
                    isRetrying={cancellationReasonsQuery.isFetching}
                  />
                ) : null}
                <div className="mb-4 space-y-2">
                  {cancellationReasons.map((reason) => (
                    <div
                      key={reason.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span
                        className={
                          reason.isActive
                            ? "text-text-primary"
                            : "text-text-disabled line-through"
                        }
                      >
                        {reason.label}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={reasonMutation.isPending}
                        onClick={() =>
                          reasonMutation.mutate(
                            {
                              type: "toggle",
                              id: reason.id,
                              isActive: !reason.isActive,
                            },
                            {
                              onSuccess: () =>
                                notifySuccess("Cancellation reasons updated"),
                              onError: (error) =>
                                notifyError(
                                  error,
                                  "Failed to update cancellation reason",
                                ),
                            },
                          )
                        }
                      >
                        {reason.isActive ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  ))}
                </div>
                <FormErrorSummary
                  messages={cancellationFormErrors.formErrorMessages}
                  className="mb-3"
                />
                <div className="flex items-end gap-2">
                  <Input
                    label="New reason"
                    required
                    value={newCancellationReason}
                    maxLength={120}
                    error={cancellationFormErrors.fieldError(
                      "label",
                      cancellationReasonError,
                    )}
                    onBlur={() => cancellationFormErrors.touchField("label")}
                    onChange={(event) => {
                      cancellationFormErrors.clearFieldError("label");
                      setNewCancellationReason(event.target.value);
                    }}
                  />
                  <Button
                    disabled={reasonMutation.isPending}
                    loading={
                      reasonMutation.isPending &&
                      reasonMutation.variables?.type === "create"
                    }
                    onClick={() => {
                      cancellationFormErrors.markSubmitted();
                      cancellationFormErrors.clearErrors();
                      if (cancellationReasonError) return;
                      reasonMutation.mutate(
                        {
                          type: "create",
                          label: newCancellationReason.trim(),
                        },
                        {
                          onSuccess: () => {
                            setNewCancellationReason("");
                            cancellationFormErrors.resetValidation();
                            notifySuccess("Cancellation reasons updated");
                          },
                          onError: (error) =>
                            cancellationFormErrors.handleApiError(
                              error,
                              ["label"],
                              "Failed to add cancellation reason",
                            ),
                        },
                      );
                    }}
                  >
                    Add
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-violet-50 rounded-lg flex items-center justify-center">
              <Palette className="w-5 h-5 text-violet-600" />
            </div>
            <h2 className="text-base font-semibold text-text-primary">
              Appearance
            </h2>
          </div>
          <ThemeSwitcher label="Theme" />
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-base font-semibold text-text-primary">
              Permissions
            </h2>
          </div>
          <div className="space-y-2">
            {user?.roles[0]?.permissions?.slice(0, 8).map((perm) => (
              <div key={perm.id} className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 bg-success rounded-full" />
                <span className="text-text-secondary">{perm.key}</span>
              </div>
            ))}
            {(user?.roles[0]?.permissions?.length ?? 0) > 8 && (
              <p className="text-xs text-text-disabled pl-3.5">
                +{(user?.roles[0]?.permissions?.length ?? 0) - 8} more
                permissions
              </p>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-base font-semibold text-text-primary">
              System Info
            </h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-secondary">Tenant ID</span>
              <span className="font-mono text-xs text-text-primary">
                {user?.tenantId?.slice(0, 12)}…
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-secondary">Branch ID</span>
              <span className="font-mono text-xs text-text-primary">
                {user?.branchId?.slice(0, 12) ?? "—"}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-text-secondary">Status</span>
              <StatusBadge tone="success" label="Active" />
            </div>
          </div>
        </Card>
      </Grid>
    </Page>
  );
};
