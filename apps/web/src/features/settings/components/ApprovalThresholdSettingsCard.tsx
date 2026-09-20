import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  FormErrorSummary,
  Input,
  QueryErrorState,
  StaleDataBanner,
} from "@pos/ui";
import { ShieldCheck } from "lucide-react";
import { createApprovalsApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";
import { notifySuccess } from "@/shared/lib/notify";
import { useLocalFormApiErrors } from "@/shared/hooks/useLocalFormApiErrors";
import { validateApprovalThreshold } from "@/features/settings/helpers/settings-validation";

const approvalsApi = createApprovalsApi(apiClient);

type ApprovalAction = "VOID" | "COMP";
type ThresholdRow = {
  id: string;
  actionType: ApprovalAction;
  thresholdAmount: string | number;
  requiresRole: string;
};

type ThresholdDraft = { thresholdAmount: string; requiresRole: string };

const DEFAULTS: Record<ApprovalAction, ThresholdDraft> = {
  VOID: { thresholdAmount: "500", requiresRole: "Manager" },
  COMP: { thresholdAmount: "500", requiresRole: "Manager" },
};

export const ApprovalThresholdSettingsCard = () => {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["approval-thresholds"] as const, []);
  const [drafts, setDrafts] =
    useState<Record<ApprovalAction, ThresholdDraft>>(DEFAULTS);
  const formErrors = useLocalFormApiErrors();
  const touchedRef = useRef<Record<ApprovalAction, boolean>>({
    VOID: false,
    COMP: false,
  });

  const thresholdsQuery = useQuery<ThresholdRow[]>({
    queryKey,
    queryFn: () => approvalsApi.listThresholds<ThresholdRow>(),
  });

  useEffect(() => {
    if (!thresholdsQuery.data) return;
    setDrafts((current) => {
      const next = { ...current };
      for (const row of thresholdsQuery.data) {
        if (touchedRef.current[row.actionType]) continue;
        next[row.actionType] = {
          thresholdAmount: String(row.thresholdAmount),
          requiresRole: row.requiresRole || "Manager",
        };
      }
      return next;
    });
  }, [thresholdsQuery.data]);

  const save = useMutation({
    mutationFn: async ({
      actionType,
      draft,
    }: {
      actionType: ApprovalAction;
      draft: ThresholdDraft;
    }) =>
      approvalsApi.setThreshold<ThresholdRow>(actionType, {
        thresholdAmount: Number(draft.thresholdAmount),
        requiresRole: draft.requiresRole.trim(),
      }),
    onSuccess: (_response, variables) => {
      formErrors.resetValidation();
      touchedRef.current[variables.actionType] = false;
      void queryClient.invalidateQueries({ queryKey });
      notifySuccess(
        `${variables.actionType === "VOID" ? "Void" : "Comp"} approval threshold updated`,
      );
    },
  });

  const update = (
    actionType: ApprovalAction,
    patch: Partial<ThresholdDraft>,
  ) => {
    for (const field of Object.keys(patch)) formErrors.clearFieldError(field);
    touchedRef.current[actionType] = true;
    setDrafts((current) => ({
      ...current,
      [actionType]: { ...current[actionType], ...patch },
    }));
  };

  if (thresholdsQuery.isError && !thresholdsQuery.data) {
    return (
      <Card>
        <QueryErrorState
          title="Unable to load approval thresholds"
          description="Void and comp approval thresholds could not be loaded. Retry before changing approval policy."
          onRetry={() => void thresholdsQuery.refetch()}
          isRetrying={thresholdsQuery.isFetching}
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
          <ShieldCheck className="h-5 w-5 text-amber-700" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Void & comp approvals
          </h2>
          <p className="text-xs text-text-secondary">
            Require step-up manager approval only when the full affected value
            exceeds a configured threshold.
          </p>
        </div>
      </div>
      {thresholdsQuery.isError && thresholdsQuery.data ? (
        <StaleDataBanner
          message="Approval thresholds could not be refreshed. Showing the latest cached policy."
          onRetry={() => void thresholdsQuery.refetch()}
          isRetrying={thresholdsQuery.isFetching}
        />
      ) : null}
      <FormErrorSummary
        messages={formErrors.formErrorMessages}
        className="mb-3"
      />
      <div className="space-y-5">
        {(["VOID", "COMP"] as const).map((actionType) => {
          const draft = drafts[actionType];
          const clientErrors = validateApprovalThreshold(draft);
          const isCurrentErrorAction =
            save.variables?.actionType === actionType;
          const thresholdError =
            (isCurrentErrorAction
              ? formErrors.fieldErrors.thresholdAmount
              : undefined) ??
            formErrors.clientError(
              `${actionType}.thresholdAmount`,
              clientErrors.thresholdAmount,
            );
          const roleError =
            (isCurrentErrorAction
              ? formErrors.fieldErrors.requiresRole
              : undefined) ??
            formErrors.clientError(
              `${actionType}.requiresRole`,
              clientErrors.requiresRole,
            );
          const isDirty = touchedRef.current[actionType];
          return (
            <div
              key={actionType}
              className="rounded-lg border border-border p-3"
            >
              <h3 className="text-sm font-semibold text-text-primary">
                {actionType === "VOID" ? "Void" : "Comp"}
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <Input
                  label="Approval threshold"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.thresholdAmount}
                  error={thresholdError}
                  onBlur={() =>
                    formErrors.touchField(`${actionType}.thresholdAmount`)
                  }
                  onChange={(event) => {
                    if (isCurrentErrorAction)
                      formErrors.clearFieldError("thresholdAmount");
                    update(actionType, { thresholdAmount: event.target.value });
                  }}
                />
                <Input
                  label="Required role"
                  value={draft.requiresRole}
                  error={roleError}
                  onBlur={() =>
                    formErrors.touchField(`${actionType}.requiresRole`)
                  }
                  onChange={(event) => {
                    if (isCurrentErrorAction)
                      formErrors.clearFieldError("requiresRole");
                    update(actionType, { requiresRole: event.target.value });
                  }}
                  placeholder="Manager"
                />
                <Button
                  loading={
                    save.isPending && save.variables?.actionType === actionType
                  }
                  disabled={save.isPending || !isDirty}
                  onClick={() => {
                    formErrors.touchField(`${actionType}.thresholdAmount`);
                    formErrors.touchField(`${actionType}.requiresRole`);
                    formErrors.clearErrors();
                    if (!isDirty || Object.keys(clientErrors).length) return;
                    save.mutate(
                      { actionType, draft },
                      {
                        onError: (error) =>
                          formErrors.handleApiError(
                            error,
                            ["thresholdAmount", "requiresRole"],
                            "Failed to update manager approval threshold",
                          ),
                      },
                    );
                  }}
                >
                  Save
                </Button>
              </div>
              <p className="mt-2 text-xs text-text-secondary">
                At or below the threshold, the normal void/comp permission is
                sufficient. Above it, the POS/waiter action asks for an
                authorized {draft.requiresRole || "manager"} credential.
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
