import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Input } from "@pos/ui";
import { createCustomersApi, createMenuApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const menuApi = createMenuApi(apiClient);
const customersApi = createCustomersApi(apiClient);
import { queryClient } from "@/shared/lib/query-client";
import type { CustomerGroup, PriceRule } from "@pos/types";
import { getErrorMessage } from "@/shared/lib/errors";

import { FULFILLMENT_TYPES } from "@/features/menu/constants";
import { usePriceRuleDraft } from "@/features/menu/hooks/usePriceRuleDraft";

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
    error,
    setField,
    markSaved,
    setError,
  } = usePriceRuleDraft();

  const key = ["menu-items", itemId, "price-rules"];
  const { data: customerGroups = [] } = useQuery<CustomerGroup[]>({
    queryKey: ["customer-groups"],
    queryFn: () => customersApi.listGroups(),
  });

  const { data: rules = [] } = useQuery<PriceRule[]>({
    queryKey: key,
    queryFn: () => menuApi.listPriceRulesFor<PriceRule>({ menuItemId: itemId }),
  });

  const save = useMutation({
    mutationFn: () =>
      menuApi.createPriceRule<PriceRule>({
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
      }),
    onSuccess: () => {
      markSaved();
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (err: unknown) => {
      setError(getErrorMessage(err, "Could not save price rule"));
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => menuApi.removePriceRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-text-primary">
        Price rules{" "}
        <span className="font-normal text-text-disabled">
          (channel and time-window pricing — e.g. delivery markup, happy hour)
        </span>
      </span>
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
            className="text-danger"
            onClick={() => remove.mutate(rule.id)}
          >
            Remove
          </button>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-2 rounded border border-border p-2">
        <select
          aria-label="Rule channel"
          value={channel}
          onChange={(event) => setField("channel", event.target.value)}
          className="rounded border border-border px-2 py-1.5 text-sm"
        >
          <option value="">Any channel</option>
          <option value="STAFF">Staff</option>
          <option value="CUSTOMER_QR">Customer QR</option>
        </select>
        <select
          aria-label="Rule fulfillment type"
          value={fulfillmentType}
          onChange={(event) => setField("fulfillmentType", event.target.value)}
          className="rounded border border-border px-2 py-1.5 text-sm"
        >
          <option value="">Any fulfillment</option>
          {FULFILLMENT_TYPES.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
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
          onChange={(event) => setField("startDate", event.target.value)}
          placeholder="Start date"
        />
        <Input
          aria-label="Rule end date"
          type="date"
          value={endDate}
          onChange={(event) => setField("endDate", event.target.value)}
          placeholder="End date"
        />
        <Input
          aria-label="Rule start time"
          type="time"
          value={startTime}
          onChange={(event) => setField("startTime", event.target.value)}
          placeholder="Start time"
        />
        <Input
          aria-label="Rule end time"
          type="time"
          value={endTime}
          onChange={(event) => setField("endTime", event.target.value)}
          placeholder="End time"
        />
        <select
          aria-label="Customer group scope"
          value={customerGroupId}
          onChange={(event) => setField("customerGroupId", event.target.value)}
          className="rounded border border-border px-2 py-1.5 text-sm"
        >
          <option value="">Any customer group</option>
          {customerGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <Input
          aria-label="Rule price"
          type="number"
          min={0}
          step="0.01"
          value={price}
          onChange={(event) => setField("price", event.target.value)}
          placeholder="Price"
        />
        <Input
          aria-label="Rule priority"
          type="number"
          value={priority}
          onChange={(event) => setField("priority", event.target.value)}
          placeholder="Priority"
        />
        <Button
          type="button"
          size="sm"
          loading={save.isPending}
          disabled={!price}
          onClick={() => save.mutate()}
        >
          Save price rule
        </Button>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
};
