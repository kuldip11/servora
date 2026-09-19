import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  FormErrorSummary,
  QueryErrorState,
  StaleDataBanner,
} from "@pos/ui";
import { ChefHat } from "lucide-react";
import type { Tenant } from "@pos/types";
import { createSettingsApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";
import { notifySuccess } from "@/shared/lib/notify";
import { useLocalFormApiErrors } from "@/shared/hooks/useLocalFormApiErrors";

const settingsApi = createSettingsApi(apiClient);

type KitchenSettings = Required<Pick<Tenant, "id" | "courseSequencingEnabled">>;

export const KitchenOperationsSettingsCard = ({
  tenantId,
}: {
  tenantId: string;
}) => {
  const qc = useQueryClient();
  const [courseSequencingEnabled, setCourseSequencingEnabled] = useState(false);
  const formErrors = useLocalFormApiErrors();
  const key = ["tenant-settings", tenantId];
  const settingsQuery = useQuery<KitchenSettings>({
    queryKey: key,
    queryFn: async () => {
      const memberships = await settingsApi.tenants<KitchenSettings>();
      const tenant = memberships.find(
        (entry) => entry.tenant.id === tenantId,
      )?.tenant;
      if (!tenant) throw new Error("Active tenant settings are unavailable");
      return tenant;
    },
  });
  useEffect(() => {
    if (settingsQuery.data)
      setCourseSequencingEnabled(settingsQuery.data.courseSequencingEnabled);
  }, [settingsQuery.data]);

  const save = useMutation({
    mutationFn: () =>
      settingsApi.updateTenant<KitchenSettings>(tenantId, {
        courseSequencingEnabled,
      }),
    onSuccess: () => {
      formErrors.clearErrors();
      qc.invalidateQueries({ queryKey: key });
      notifySuccess("Kitchen operations settings updated");
    },
  });

  if (settingsQuery.isError && !settingsQuery.data) {
    return (
      <Card>
        <QueryErrorState
          title="Unable to load kitchen settings"
          description="Kitchen configuration could not be loaded. Retry before changing course sequencing."
          onRetry={() => void settingsQuery.refetch()}
          isRetrying={settingsQuery.isFetching}
        />
      </Card>
    );
  }

  const isDirty =
    settingsQuery.data !== undefined &&
    courseSequencingEnabled !== settingsQuery.data.courseSequencingEnabled;

  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
          <ChefHat className="h-5 w-5 text-amber-700" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Kitchen operations
          </h2>
          <p className="text-xs text-text-secondary">
            Optional fine-dining course sequencing
          </p>
        </div>
      </div>
      {settingsQuery.isError && settingsQuery.data ? (
        <StaleDataBanner
          message="Kitchen settings refresh failed — showing the latest cached value."
          onRetry={() => void settingsQuery.refetch()}
          isRetrying={settingsQuery.isFetching}
        />
      ) : null}
      <FormErrorSummary
        messages={formErrors.formErrorMessages}
        className="mb-3"
      />
      <label className="flex items-start gap-3 text-sm text-text-secondary">
        <input
          type="checkbox"
          className="mt-1"
          checked={courseSequencingEnabled}
          onChange={(event) => {
            formErrors.clearFieldError("courseSequencingEnabled");
            setCourseSequencingEnabled(event.target.checked);
          }}
        />
        <span>
          <strong className="block text-text-primary">
            Enable course sequencing
          </strong>
          Allow staff to explicitly place an order/round into course mode.
          Ordinary orders remain immediate-fire and unchanged.
        </span>
      </label>
      <div className="mt-4 flex justify-end">
        <Button
          loading={save.isPending}
          disabled={settingsQuery.isLoading || save.isPending || !isDirty}
          onClick={() => {
            formErrors.clearErrors();
            if (!isDirty) return;
            save.mutate(undefined, {
              onError: (error) =>
                formErrors.handleApiError(
                  error,
                  ["courseSequencingEnabled"],
                  "Failed to update kitchen operations settings",
                ),
            });
          }}
        >
          Save kitchen settings
        </Button>
      </div>
    </Card>
  );
};
