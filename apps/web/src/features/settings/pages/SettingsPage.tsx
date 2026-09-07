import { useAuthStore } from "@/store/auth";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Input } from "@pos/ui";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import {
  Card,
  Page,
  PageHeader,
  Grid,
  StatusBadge,
  ThemeSwitcher,
} from "@pos/ui";
import { Building2, Shield, Palette } from "lucide-react";
import { usePermissions } from "@/shared/auth/permissions";
import {
  useCancellationReasons,
  cancellationReasonKeys,
} from "@/features/orders/hooks/useCancellationReasons";
import { cancellationReasonsService } from "@/features/orders/services/cancellation-reasons.service";
import { PricingSettingsCard } from "@/features/settings/components/PricingSettingsCard";
import { KitchenOperationsSettingsCard } from "@/features/settings/components/KitchenOperationsSettingsCard";
import { ApprovalThresholdSettingsCard } from "@/features/settings/components/ApprovalThresholdSettingsCard";

export const SettingsPage = () => {
  const { user, franchiseId } = useAuthStore();
  const { has } = usePermissions();
  const queryClient = useQueryClient();
  const { data: cancellationReasons = [] } = useCancellationReasons(
    false,
    has("settings:update") && has("orders:read"),
  );
  const [newCancellationReason, setNewCancellationReason] = useState("");
  const reasonMutation = useMutation({
    mutationFn: (
      action:
        | { type: "create"; label: string }
        | { type: "toggle"; id: string; isActive: boolean },
    ) =>
      action.type === "create"
        ? cancellationReasonsService.create(action.label)
        : cancellationReasonsService.update(action.id, {
            isActive: action.isActive,
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cancellationReasonKeys.all });
      queryClient.invalidateQueries({
        queryKey: cancellationReasonKeys.active,
      });
      setNewCancellationReason("");
      notifySuccess("Cancellation reasons updated");
    },
    onError: (error) =>
      notifyError(error, "Failed to update cancellation reasons"),
  });
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

        {has("settings:update") && (
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-base font-semibold text-text-primary">
                Cancellation reasons
              </h2>
            </div>
            <div className="space-y-2 mb-4">
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
                    onClick={() =>
                      reasonMutation.mutate({
                        type: "toggle",
                        id: reason.id,
                        isActive: !reason.isActive,
                      })
                    }
                  >
                    {reason.isActive ? "Disable" : "Enable"}
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <Input
                label="New reason"
                value={newCancellationReason}
                onChange={(event) =>
                  setNewCancellationReason(event.target.value)
                }
              />
              <Button
                disabled={!newCancellationReason.trim()}
                loading={reasonMutation.isPending}
                onClick={() =>
                  reasonMutation.mutate({
                    type: "create",
                    label: newCancellationReason.trim(),
                  })
                }
              >
                Add
              </Button>
            </div>
          </Card>
        )}

        {}
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
