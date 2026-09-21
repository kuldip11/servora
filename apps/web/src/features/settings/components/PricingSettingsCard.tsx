import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  FormErrorSummary,
  Input,
  QueryErrorState,
  Select,
  StaleDataBanner,
} from "@pos/ui";
import { ReceiptText } from "lucide-react";
import { createSettingsApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";
import { notifySuccess } from "@/shared/lib/notify";
import { useLocalFormApiErrors } from "@/shared/hooks/useLocalFormApiErrors";
import { validateServiceChargePercent } from "@/features/settings/helpers/settings-validation";
import type { Tenant } from "@pos/types";

const settingsApi = createSettingsApi(apiClient);

type TenantSettings = Required<
  Pick<
    Tenant,
    | "id"
    | "serviceChargePercent"
    | "serviceChargeTaxable"
    | "roundingPolicy"
    | "defaultTaxMode"
  >
>;

export const PricingSettingsCard = ({ tenantId }: { tenantId: string }) => {
  const qc = useQueryClient();
  const [serviceChargePercent, setServiceChargePercent] = useState("");
  const [serviceChargeTaxable, setServiceChargeTaxable] = useState(false);
  const [roundingPolicy, setRoundingPolicy] =
    useState<TenantSettings["roundingPolicy"]>("NONE");
  const [defaultTaxMode, setDefaultTaxMode] =
    useState<TenantSettings["defaultTaxMode"]>("EXCLUSIVE");
  const formErrors = useLocalFormApiErrors();
  const key = ["tenant-settings", tenantId];
  const settingsQuery = useQuery<TenantSettings>({
    queryKey: key,
    queryFn: async () => {
      const memberships = await settingsApi.tenants<TenantSettings>();
      const tenant = memberships.find(
        (entry) => entry.tenant.id === tenantId,
      )?.tenant;
      if (!tenant) throw new Error("Active tenant settings are unavailable");
      return tenant;
    },
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    setServiceChargePercent(
      settingsQuery.data.serviceChargePercent == null
        ? ""
        : String(settingsQuery.data.serviceChargePercent),
    );
    setServiceChargeTaxable(settingsQuery.data.serviceChargeTaxable);
    setRoundingPolicy(settingsQuery.data.roundingPolicy);
    setDefaultTaxMode(settingsQuery.data.defaultTaxMode);
  }, [settingsQuery.data]);

  const clientError = useMemo(
    () => validateServiceChargePercent(serviceChargePercent),
    [serviceChargePercent],
  );
  const isDirty = Boolean(
    settingsQuery.data &&
    (serviceChargePercent !==
      (settingsQuery.data.serviceChargePercent == null
        ? ""
        : String(settingsQuery.data.serviceChargePercent)) ||
      serviceChargeTaxable !== settingsQuery.data.serviceChargeTaxable ||
      roundingPolicy !== settingsQuery.data.roundingPolicy ||
      defaultTaxMode !== settingsQuery.data.defaultTaxMode),
  );

  const save = useMutation({
    mutationFn: () =>
      settingsApi.updateTenant<TenantSettings>(tenantId, {
        serviceChargePercent:
          serviceChargePercent.trim() === ""
            ? null
            : Number(serviceChargePercent),
        serviceChargeTaxable,
        roundingPolicy,
        defaultTaxMode,
      }),
    onSuccess: () => {
      formErrors.resetValidation();
      qc.invalidateQueries({ queryKey: key });
      notifySuccess("Pricing settings updated");
    },
  });

  if (settingsQuery.isError && !settingsQuery.data) {
    return (
      <Card>
        <QueryErrorState
          title="Unable to load pricing settings"
          description="Pricing and tax settings could not be loaded. Retry before changing them so missing configuration is not treated as defaults."
          onRetry={() => void settingsQuery.refetch()}
          isRetrying={settingsQuery.isFetching}
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
          <ReceiptText className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Pricing & tax
          </h2>
          <p className="text-xs text-text-secondary">
            Authoritative stages 7–9 settings
          </p>
        </div>
      </div>
      {settingsQuery.isError && settingsQuery.data ? (
        <StaleDataBanner
          message="Pricing settings refresh failed — showing the latest cached values."
          onRetry={() => void settingsQuery.refetch()}
          isRetrying={settingsQuery.isFetching}
        />
      ) : null}
      <FormErrorSummary
        messages={formErrors.formErrorMessages}
        className="mb-3"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Service charge %"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={serviceChargePercent}
          error={formErrors.fieldError("serviceChargePercent", clientError)}
          onBlur={() => formErrors.touchField("serviceChargePercent")}
          onChange={(event) => {
            formErrors.clearFieldError("serviceChargePercent");
            setServiceChargePercent(event.target.value);
          }}
        />
        <label className="flex items-end gap-2 pb-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={serviceChargeTaxable}
            onChange={(event) => setServiceChargeTaxable(event.target.checked)}
          />{" "}
          Service charge is taxable
        </label>
        <Select
          label="Rounding policy"
          value={roundingPolicy}
          error={formErrors.fieldErrors.roundingPolicy}
          onChange={(event) => {
            formErrors.clearFieldError("roundingPolicy");
            setRoundingPolicy(event as TenantSettings["roundingPolicy"]);
          }}
          options={[
            { value: "NONE", label: "No rounding" },
            { value: "NEAREST_1", label: "Nearest 1" },
            { value: "NEAREST_5", label: "Nearest 5" },
            { value: "NEAREST_10", label: "Nearest 10" },
          ]}
        />
        <Select
          label="Default tax mode"
          value={defaultTaxMode}
          error={formErrors.fieldErrors.defaultTaxMode}
          onChange={(event) => {
            formErrors.clearFieldError("defaultTaxMode");
            setDefaultTaxMode(event as TenantSettings["defaultTaxMode"]);
          }}
          options={[
            { value: "EXCLUSIVE", label: "Tax exclusive" },
            { value: "INCLUSIVE", label: "Tax inclusive" },
          ]}
        />
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          loading={save.isPending}
          disabled={settingsQuery.isLoading || save.isPending || !isDirty}
          onClick={() => {
            formErrors.markSubmitted();
            formErrors.clearErrors();
            if (clientError || !isDirty) return;
            save.mutate(undefined, {
              onError: (error) =>
                formErrors.handleApiError(
                  error,
                  [
                    "serviceChargePercent",
                    "serviceChargeTaxable",
                    "roundingPolicy",
                    "defaultTaxMode",
                  ],
                  "Failed to update pricing settings",
                ),
            });
          }}
        >
          Save pricing settings
        </Button>
      </div>
    </Card>
  );
};
