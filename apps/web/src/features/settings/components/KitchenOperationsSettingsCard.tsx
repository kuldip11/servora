import { useEffect, useState } from "react";
import {
  Button,
  Card,
  FormErrorSummary,
  QueryErrorState,
  StaleDataBanner,
} from "@pos/ui";
import { ChefHat } from "lucide-react";
import { notifySuccess } from "@/shared/lib/notify";
import { useLocalFormApiErrors } from "@/shared/hooks/useLocalFormApiErrors";

import {
  useTenantSettings,
  useUpdateTenantSettings,
} from "@/features/settings/hooks/useTenantSettings";

export const KitchenOperationsSettingsCard = ({
  tenantId,
}: {
  tenantId: string;
}) => {
  const [courseSequencingEnabled, setCourseSequencingEnabled] = useState(false);
  const formErrors = useLocalFormApiErrors();
  const settingsQuery = useTenantSettings(tenantId);
  const save = useUpdateTenantSettings(tenantId);
  useEffect(() => {
    if (settingsQuery.data)
      setCourseSequencingEnabled(settingsQuery.data.courseSequencingEnabled);
  }, [settingsQuery.data]);

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
            save.mutate(
              { courseSequencingEnabled },
              {
                onSuccess: () => {
                  formErrors.clearErrors();
                  notifySuccess("Kitchen operations settings updated");
                },
                onError: (error) =>
                  formErrors.handleApiError(
                    error,
                    ["courseSequencingEnabled"],
                    "Failed to update kitchen operations settings",
                  ),
              },
            );
          }}
        >
          Save kitchen settings
        </Button>
      </div>
    </Card>
  );
};
