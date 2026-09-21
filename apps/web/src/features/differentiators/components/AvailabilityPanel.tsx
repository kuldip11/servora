import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge, Button, Card, Select, toast } from "@pos/ui";
import { createAvailabilityApi } from "@pos/api-client";
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
        <Select
          label="Channel"
          value={channel}
          onChange={setChannel}
          options={[
            { value: "UNSCOPED", label: "All channels" },
            { value: "STAFF", label: "Staff" },
            { value: "CUSTOMER_QR", label: "Customer QR" },
          ]}
        />
        <Select
          label="Fulfillment"
          value={fulfillment}
          onChange={setFulfillment}
          options={[
            { value: "UNSCOPED", label: "All fulfillment types" },
            { value: "DINE_IN", label: "Dine in" },
            { value: "TAKEAWAY", label: "Takeaway" },
            { value: "DELIVERY", label: "Delivery" },
            { value: "ONLINE", label: "Online" },
          ]}
        />
        <Select
          label="Cause"
          value={cause}
          onChange={setCause}
          options={[
            { value: "", label: "All causes" },
            { value: "MANUAL_OVERRIDE", label: "Manual override" },
            { value: "MANUAL_COUNT", label: "Manual count" },
            { value: "RECIPE_DRIVEN", label: "Recipe / inventory" },
            { value: "SCHEDULE", label: "Schedule" },
            { value: "CHANNEL_OVERRIDE", label: "Channel override" },
            { value: "BRANCH_OVERRIDE", label: "Branch override" },
            { value: "COMPUTED_STATUS", label: "Computed variant status" },
            { value: "BASE_STATUS", label: "Base status" },
          ]}
        />
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
