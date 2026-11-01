import { useMemo } from "react";
import {
  Button,
  FormErrorSummary,
  Input,
  QueryErrorState,
  Select,
  StaleDataBanner,
} from "@pos/ui";
import type { PriceRule } from "@pos/types";
import { useLocalFormApiErrors } from "@/shared/hooks/useLocalFormApiErrors";

import { FULFILLMENT_TYPES } from "@/features/menu/constants";
import { usePriceRuleDraft } from "@/features/menu/hooks/usePriceRuleDraft";
import { validatePriceRuleForm } from "@/features/menu/helpers/price-rule-form";
import { useCustomerGroups } from "@/features/menu/hooks/useLoyalty";
import {
  useCreateItemPriceRule,
  useItemPriceRules,
  useRemoveItemPriceRule,
} from "@/features/menu/hooks/usePriceRules";

const describeRule = (rule: PriceRule) => {
  const scope = [
    rule.channel ?? "Any channel",
    rule.fulfillmentType ?? "Any fulfillment",
    rule.branchId ? "This branch" : "All branches",
  ].join(" · ");
  const window = [
    rule.startDate || rule.endDate
      ? `${rule.startDate ?? "…"} → ${rule.endDate ?? "…"}`
      : null,
    rule.startTime || rule.endTime
      ? `${rule.startTime ?? "00:00"}–${rule.endTime ?? "24:00"}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return `${scope}${window ? ` · ${window}` : ""}`;
};

export const PriceRulesPanel = ({
  itemId,
  branchId,
}: {
  itemId: string;
  branchId?: string | null;
}) => {
  const {
    channel,
    fulfillmentType,
    scopeToBranch,
    startDate,
    endDate,
    startTime,
    endTime,
    price,
    priority,
    customerGroupId,
    setField,
    markSaved,
  } = usePriceRuleDraft();
  const {
    fieldErrors,
    formErrorMessages,
    clearErrors,
    clearFieldError,
    fieldError,
    touchField,
    markSubmitted,
    resetValidation,
    handleApiError,
  } = useLocalFormApiErrors();

  const customerGroupsQuery = useCustomerGroups();
  const rulesQuery = useItemPriceRules(itemId);

  const clientErrors = useMemo(
    () =>
      validatePriceRuleForm({
        startDate,
        endDate,
        startTime,
        endTime,
        price,
        priority,
      }),
    [endDate, endTime, price, priority, startDate, startTime],
  );
  const dependencyFailed =
    (rulesQuery.isError && !rulesQuery.data) ||
    (customerGroupsQuery.isError && !customerGroupsQuery.data);
  const dependencyLoading =
    rulesQuery.isLoading || customerGroupsQuery.isLoading;

  const save = useCreateItemPriceRule(itemId);
  const remove = useRemoveItemPriceRule(itemId);

  if (dependencyFailed) {
    return (
      <QueryErrorState
        title="Unable to load price-rule dependencies"
        description="Price rules or customer groups could not be loaded. Retry before changing pricing so missing data is not treated as valid configuration."
        onRetry={() =>
          void Promise.all([
            rulesQuery.refetch(),
            customerGroupsQuery.refetch(),
          ])
        }
        isRetrying={rulesQuery.isFetching || customerGroupsQuery.isFetching}
      />
    );
  }

  const rules = rulesQuery.data ?? [];
  const customerGroups = customerGroupsQuery.data ?? [];

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-text-primary">
        Price rules{" "}
        <span className="font-normal text-text-disabled">
          (channel and time-window pricing — e.g. delivery markup, happy hour)
        </span>
      </span>
      {(rulesQuery.isError || customerGroupsQuery.isError) && (
        <StaleDataBanner
          message="Price-rule data could not be refreshed. Showing the latest cached configuration."
          onRetry={() =>
            void Promise.all([
              rulesQuery.refetch(),
              customerGroupsQuery.refetch(),
            ])
          }
          isRetrying={rulesQuery.isFetching || customerGroupsQuery.isFetching}
        />
      )}
      {rules.map((rule) => (
        <div
          key={rule.id}
          className="flex items-center justify-between rounded bg-surface-secondary px-3 py-2 text-xs"
        >
          <span>
            {rule.percentOff !== null
              ? `${rule.percentOff}% off`
              : `₹${rule.price}`}{" "}
            · {describeRule(rule)} · priority {rule.priority}
          </span>
          <button
            type="button"
            className="text-danger disabled:opacity-50"
            disabled={remove.isPending}
            onClick={() => remove.mutate(rule.id)}
          >
            Remove
          </button>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-2 rounded border border-border p-2">
        <div className="col-span-2">
          <FormErrorSummary messages={formErrorMessages} />
        </div>
        <Select
          aria-label="Rule channel"
          value={channel}
          onChange={(event) => setField("channel", event)}
          options={[
            { value: "", label: "Any channel" },
            { value: "STAFF", label: "Staff" },
            { value: "CUSTOMER_QR", label: "Customer QR" },
          ]}
        />
        <Select
          aria-label="Rule fulfillment type"
          value={fulfillmentType}
          onChange={(event) => setField("fulfillmentType", event)}
          options={[
            { value: "", label: "Any fulfillment" },
            ...FULFILLMENT_TYPES.map((type) => ({ value: type, label: type })),
          ]}
        />
        {branchId ? (
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={scopeToBranch}
              onChange={(event) =>
                setField("scopeToBranch", event.target.checked)
              }
            />
            Scope to this branch only
          </label>
        ) : null}
        <Input
          aria-label="Rule start date"
          type="date"
          value={startDate}
          error={fieldError("startDate", clientErrors.startDate)}
          onBlur={() => touchField("startDate")}
          onChange={(event) => {
            clearFieldError("startDate");
            setField("startDate", event.target.value);
          }}
          placeholder="Start date"
        />
        <Input
          aria-label="Rule end date"
          type="date"
          value={endDate}
          error={fieldError("endDate", clientErrors.endDate)}
          onBlur={() => touchField("endDate")}
          onChange={(event) => {
            clearFieldError("endDate");
            setField("endDate", event.target.value);
          }}
          placeholder="End date"
        />
        <Input
          aria-label="Rule start time"
          type="time"
          value={startTime}
          error={fieldError("startTime", clientErrors.startTime)}
          onBlur={() => touchField("startTime")}
          onChange={(event) => {
            clearFieldError("startTime");
            setField("startTime", event.target.value);
          }}
          placeholder="Start time"
        />
        <Input
          aria-label="Rule end time"
          type="time"
          value={endTime}
          error={fieldError("endTime", clientErrors.endTime)}
          onBlur={() => touchField("endTime")}
          onChange={(event) => {
            clearFieldError("endTime");
            setField("endTime", event.target.value);
          }}
          placeholder="End time"
        />
        <Select
          aria-label="Customer group scope"
          value={customerGroupId}
          error={fieldErrors.customerGroupId}
          onChange={(event) => {
            clearFieldError("customerGroupId");
            setField("customerGroupId", event);
          }}
          options={[
            { value: "", label: "Any customer group" },
            ...customerGroups.map((group) => ({
              value: group.id,
              label: group.name,
            })),
          ]}
        />
        <Input
          aria-label="Rule price"
          type="number"
          min={0}
          step="0.01"
          value={price}
          error={fieldError("price", clientErrors.price)}
          onBlur={() => touchField("price")}
          onChange={(event) => {
            clearFieldError("price");
            setField("price", event.target.value);
          }}
          placeholder="Price"
        />
        <Input
          aria-label="Rule priority"
          type="number"
          value={priority}
          error={fieldError("priority", clientErrors.priority)}
          onBlur={() => touchField("priority")}
          onChange={(event) => {
            clearFieldError("priority");
            setField("priority", event.target.value);
          }}
          placeholder="Priority"
        />
        <Button
          type="button"
          size="sm"
          loading={save.isPending}
          disabled={
            dependencyLoading ||
            dependencyFailed ||
            save.isPending ||
            Object.keys(clientErrors).length > 0
          }
          onClick={() => {
            markSubmitted();
            clearErrors();
            if (Object.keys(clientErrors).length) return;
            save.mutate(
              {
                menuItemId: itemId,
                branchId: scopeToBranch && branchId ? branchId : undefined,
                channel: channel || undefined,
                fulfillmentType: fulfillmentType || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                startTime: startTime || undefined,
                endTime: endTime || undefined,
                customerGroupId: customerGroupId || undefined,
                price: Number(price),
                priority: Number(priority) || 0,
              },
              {
                onSuccess: () => {
                  resetValidation();
                  markSaved();
                },
                onError: (error) =>
                  handleApiError(
                    error,
                    [
                      "channel",
                      "fulfillmentType",
                      "startDate",
                      "endDate",
                      "startTime",
                      "endTime",
                      "customerGroupId",
                      "price",
                      "priority",
                    ],
                    "Could not save price rule",
                  ),
              },
            );
          }}
        >
          Save price rule
        </Button>
      </div>
    </div>
  );
};
