import { useState } from "react";
import {
  Button,
  Input,
  QueryErrorState,
  Select,
  StaleDataBanner,
} from "@pos/ui";
import {
  useChannelOverrides,
  useDeleteChannelOverride,
  useSaveChannelOverride,
} from "@/features/menu/hooks/useChannelOverrides";

import { FULFILLMENT_TYPES } from "@/features/menu/constants";

export const ChannelOverridesPanel = ({ itemId }: { itemId: string }) => {
  const [channel, setChannel] = useState("CUSTOMER_QR");
  const [fulfillmentType, setFulfillmentType] = useState("DELIVERY");
  const [status, setStatus] = useState("OUT_OF_STOCK");
  const [isHidden, setIsHidden] = useState(false);
  const [reason, setReason] = useState("");
  const overridesQuery = useChannelOverrides(itemId);
  const overrides = overridesQuery.data ?? [];
  const save = useSaveChannelOverride(itemId);
  const remove = useDeleteChannelOverride(itemId);
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-text-primary">
        Channel availability{" "}
        <span className="font-normal text-text-disabled">
          (overrides this item only for the selected ordering context)
        </span>
      </span>
      {overridesQuery.isError && !overridesQuery.data ? (
        <QueryErrorState
          title="Unable to load channel overrides"
          description="Existing channel availability could not be loaded. Retry before changing overrides."
          onRetry={() => void overridesQuery.refetch()}
          isRetrying={overridesQuery.isFetching}
        />
      ) : null}
      {overridesQuery.isError && overridesQuery.data ? (
        <StaleDataBanner
          message="Channel overrides could not be refreshed. Showing cached values; saving is disabled until refreshed."
          onRetry={() => void overridesQuery.refetch()}
          isRetrying={overridesQuery.isFetching}
        />
      ) : null}
      {overrides.map((override) => (
        <div
          key={override.id}
          className="flex items-center justify-between rounded bg-surface-secondary px-3 py-2 text-xs"
        >
          <span>
            {override.channel} · {override.fulfillmentType ?? "All fulfillment"}{" "}
            · {override.isHidden ? "Hidden" : (override.status ?? "Default")}
          </span>
          <button
            type="button"
            className="text-danger"
            onClick={() => remove.mutate(override.id)}
          >
            Remove
          </button>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-2 rounded border border-border p-2">
        <Select
          aria-label="Ordering channel"
          value={channel}
          onChange={setChannel}
          className="text-sm"
          options={[
            { value: "STAFF", label: "Staff" },
            { value: "CUSTOMER_QR", label: "Customer QR" },
          ]}
        />
        <Select
          aria-label="Fulfillment type"
          value={fulfillmentType}
          onChange={setFulfillmentType}
          className="text-sm"
          options={FULFILLMENT_TYPES.map((type) => ({
            value: type,
            label: type,
          }))}
        />
        <Select
          aria-label="Channel status"
          value={status}
          onChange={setStatus}
          className="text-sm"
          options={[
            { value: "ACTIVE", label: "Active" },
            { value: "OUT_OF_STOCK", label: "Out of stock" },
            { value: "HIDDEN", label: "Hidden status" },
            { value: "SEASONAL", label: "Seasonal" },
            { value: "DISCONTINUED", label: "Discontinued" },
          ]}
        />
        <Input
          aria-label="Channel override reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason (optional)"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isHidden}
            onChange={(event) => setIsHidden(event.target.checked)}
          />{" "}
          Hide from this channel
        </label>
        <Button
          type="button"
          size="sm"
          loading={save.isPending}
          disabled={save.isPending || overridesQuery.isError}
          onClick={() =>
            save.mutate({
              channel,
              fulfillmentType,
              status,
              isHidden,
              availabilityReason: reason || null,
            })
          }
        >
          Save override
        </Button>
      </div>
    </div>
  );
};
