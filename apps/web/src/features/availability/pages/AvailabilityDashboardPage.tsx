import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Page,
  PageHeader,
  SearchInput,
  Select,
  Spinner,
} from "@pos/ui";
import { extractApiError } from "@/shared/lib/api-client";
import { useRealtimeEvent } from "@/shared/lib/realtime";

import { AVAILABILITY_CAUSES } from "@/features/availability/constants";
import { useAvailabilityDashboard } from "@/features/availability/hooks/useAvailabilityDashboard";
import type { AvailabilityRow } from "@/features/availability/services/availability.service";

export const AvailabilityDashboardPage = () => {
  const [channel, setChannel] = useState("UNSCOPED");
  const [fulfillmentType, setFulfillmentType] = useState("UNSCOPED");
  const [cause, setCause] = useState("");
  const [search, setSearch] = useState("");
  const availabilityQuery = useAvailabilityDashboard({
    channel,
    fulfillmentType,
    ...(cause ? { cause } : {}),
  });
  const rows = availabilityQuery.data ?? [];

  useRealtimeEvent("menu.availability.updated", () => {
    void availabilityQuery.refetch();
  });

  const grouped = useMemo(() => {
    const groups = new Map<string, AvailabilityRow[]>();
    const query = search.trim().toLowerCase();
    for (const row of rows) {
      if (
        query &&
        !`${row.name} ${row.branchName ?? ""} ${row.reason}`
          .toLowerCase()
          .includes(query)
      )
        continue;
      const key = `${row.entityType}:${row.entityId}:${row.branchId}:${row.cause}:${row.reason}`;
      const values = groups.get(key) ?? [];
      values.push(row);
      groups.set(key, values);
    }
    return [...groups.values()].sort((left, right) =>
      left[0]!.name.localeCompare(right[0]!.name),
    );
  }, [rows, search]);

  return (
    <Page>
      <PageHeader
        title="Live availability"
        description="Authoritative unavailable items, variants, and modifiers across branches, channels, and fulfillment types."
        actions={
          <Badge variant={grouped.length ? "warning" : "success"}>
            {grouped.length} actionable exceptions
          </Badge>
        }
      />

      <Card>
        <div className="grid gap-3 md:grid-cols-5 md:items-end">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch("")}
            placeholder="Search item or branch"
            aria-label="Search availability exceptions"
          />
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
            value={fulfillmentType}
            onChange={setFulfillmentType}
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
              ...AVAILABILITY_CAUSES.map((value) => ({
                value,
                label: value.replace(/_/g, " "),
              })),
            ]}
          />
          <Button
            variant="secondary"
            onClick={() => void availabilityQuery.refetch()}
            loading={availabilityQuery.isFetching}
          >
            Refresh
          </Button>
        </div>
      </Card>

      {availabilityQuery.error ? (
        <Card className="border-danger/30 bg-danger-surface">
          <p className="text-sm font-semibold text-danger">
            Availability dashboard unavailable
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {extractApiError(availabilityQuery.error)}
          </p>
        </Card>
      ) : availabilityQuery.isLoading && rows.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <p className="text-sm font-medium text-success">
            Everything in the selected scope is currently available.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map((groupRows) => {
            const row = groupRows[0]!;
            const scopes = [
              ...new Set(
                groupRows.map(
                  (item) => `${item.channel} · ${item.fulfillmentType}`,
                ),
              ),
            ];
            return (
              <Card
                key={`${row.entityId}:${row.branchId}:${row.cause}:${row.reason}`}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-text-primary">
                      {row.name}
                    </h2>
                    <p className="text-xs text-text-secondary">
                      {row.entityType.replace(/_/g, " ")} ·{" "}
                      {row.branchName ?? "Current branch"}
                    </p>
                  </div>
                  <Badge variant="warning">
                    {row.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="rounded-lg bg-surface-secondary p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-disabled">
                    Why
                  </p>
                  <p className="mt-1 text-sm text-text-primary">{row.reason}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {scopes.map((scope) => (
                    <Badge key={scope}>{scope.replace(/_/g, " ")}</Badge>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Page>
  );
};

export default AvailabilityDashboardPage;
