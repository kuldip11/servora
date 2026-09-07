import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge, Button, Card, toast } from "@pos/ui";
import { createAvailabilityApi } from "@pos/api-client";
import { DIFFERENTIATORS_SELECT_CLASS } from "@/features/differentiators/constants";
import { apiClient, extractApiError } from "@/shared/lib/api-client";
import { useRealtimeEvent } from "@/shared/lib/realtime";

type AvailabilityRow = {
  entityType: "ITEM" | "VARIANT" | "MODIFIER_OPTION";
  entityId: string;
  menuItemId: string;
  name: string;
  status: string;
  reason: string;
  cause: string;
  branchId: string;
  branchName?: string;
  channel: string;
  fulfillmentType: string;
};

const availabilityApi = createAvailabilityApi(apiClient);

export const AvailabilityPanel = () => {
  const [channel, setChannel] = useState("UNSCOPED");
  const [fulfillment, setFulfillment] = useState("UNSCOPED");
  const [cause, setCause] = useState("");
  const availabilityQuery = useQuery({
    queryKey: ["differentiators", "availability"],
    queryFn: () =>
      availabilityApi.dashboard<{ rows: AvailabilityRow[] }>({
        channel,
        fulfillmentType: fulfillment,
        ...(cause.trim() ? { cause: cause.trim() } : {}),
      }),
    retry: false,
    refetchOnMount: false,
  });

  useRealtimeEvent("menu.availability.updated", () => {
    void availabilityQuery.refetch();
  });

  useEffect(() => {
    if (availabilityQuery.error) {
      toast({
        title: extractApiError(availabilityQuery.error),
        tone: "danger",
      });
    }
  }, [availabilityQuery.error]);

  const refresh = async () => {
    const result = await availabilityQuery.refetch();
    if (result.error) {
      toast({ title: extractApiError(result.error), tone: "danger" });
    }
  };

  const rows = availabilityQuery.data?.rows ?? [];

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold">
            Unavailable across authorized branches and channels
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            All availability comes from the authoritative resolver; this view
            only aggregates its output.
          </p>
        </div>
        <Button loading={availabilityQuery.isFetching} onClick={refresh}>
          Refresh
        </Button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="text-sm font-medium text-text-primary">
          Channel
          <select
            className={`mt-1 w-full ${DIFFERENTIATORS_SELECT_CLASS}`}
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
          >
            <option value="UNSCOPED">All channels</option>
            <option value="STAFF">Staff</option>
            <option value="CUSTOMER_QR">Customer QR</option>
          </select>
        </label>
        <label className="text-sm font-medium text-text-primary">
          Fulfillment
          <select
            className={`mt-1 w-full ${DIFFERENTIATORS_SELECT_CLASS}`}
            value={fulfillment}
            onChange={(event) => setFulfillment(event.target.value)}
          >
            <option value="UNSCOPED">All fulfillment types</option>
            <option value="DINE_IN">Dine in</option>
            <option value="TAKEAWAY">Takeaway</option>
            <option value="DELIVERY">Delivery</option>
            <option value="ONLINE">Online</option>
          </select>
        </label>
        <label className="text-sm font-medium text-text-primary">
          Cause
          <select
            className={`mt-1 w-full ${DIFFERENTIATORS_SELECT_CLASS}`}
            value={cause}
            onChange={(event) => setCause(event.target.value)}
          >
            <option value="">All causes</option>
            <option value="MANUAL_OVERRIDE">Manual override</option>
            <option value="MANUAL_COUNT">Manual count</option>
            <option value="RECIPE_DRIVEN">Recipe / inventory</option>
            <option value="SCHEDULE">Schedule</option>
            <option value="CHANNEL_OVERRIDE">Channel override</option>
            <option value="BRANCH_OVERRIDE">Branch override</option>
            <option value="COMPUTED_STATUS">Computed variant status</option>
            <option value="BASE_STATUS">Base status</option>
          </select>
        </label>
      </div>
      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.map((row) => (
            <div
              key={`${row.branchId}:${row.channel}:${row.fulfillmentType}:${row.entityType}:${row.entityId}`}
              className="rounded-lg border border-border p-3"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <strong>{row.name}</strong>
                  <p className="mt-1 text-xs text-text-secondary">
                    {row.branchName ?? row.branchId} ·{" "}
                    {row.entityType.replace(/_/g, " ")} · {row.channel} ·{" "}
                    {row.fulfillmentType}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="warning">{row.cause}</Badge>
                  <Badge variant="danger">{row.status}</Badge>
                </div>
              </div>
              <p className="mt-2 text-sm text-text-secondary">{row.reason}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-text-secondary">
            Everything is available in the selected scope.
          </p>
        )}
      </div>
    </Card>
  );
};
