import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Page,
  PageHeader,
  SearchInput,
  Spinner,
} from "@pos/ui";
import { createAvailabilityApi } from "@pos/api-client";
import { apiClient, extractApiError } from "@/shared/lib/api-client";

const availabilityApi = createAvailabilityApi(apiClient);
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

type DashboardResponse = {
  rows: AvailabilityRow[];
};

import {
  AVAILABILITY_CAUSES,
  AVAILABILITY_SELECT_CLASS,
} from "@/features/availability/constants";

export const AvailabilityDashboardPage = () => {
  const [channel, setChannel] = useState("UNSCOPED");
  const [fulfillmentType, setFulfillmentType] = useState("UNSCOPED");
  const [cause, setCause] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<AvailabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await availabilityApi.dashboard<DashboardResponse>({
        channel,
        fulfillmentType,
        ...(cause ? { cause } : {}),
      });
      setRows(response.rows);
    } catch (reason) {
      setError(extractApiError(reason));
    } finally {
      setLoading(false);
    }
  }, [cause, channel, fulfillmentType]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeEvent("menu.availability.updated", () => {
    void load();
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
          <label className="text-sm font-medium text-text-primary">
            Channel
            <select
              className={`mt-1 w-full ${AVAILABILITY_SELECT_CLASS}`}
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
              className={`mt-1 w-full ${AVAILABILITY_SELECT_CLASS}`}
              value={fulfillmentType}
              onChange={(event) => setFulfillmentType(event.target.value)}
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
              className={`mt-1 w-full ${AVAILABILITY_SELECT_CLASS}`}
              value={cause}
              onChange={(event) => setCause(event.target.value)}
            >
              <option value="">All causes</option>
              {AVAILABILITY_CAUSES.map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="secondary"
            onClick={() => void load()}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </Card>

      {error ? (
        <Card className="border-danger/30 bg-danger-surface">
          <p className="text-sm font-semibold text-danger">
            Availability dashboard unavailable
          </p>
          <p className="mt-1 text-sm text-text-secondary">{error}</p>
        </Card>
      ) : loading && rows.length === 0 ? (
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
                    Why is this unavailable?
                  </p>
                  <p className="mt-1 text-sm font-medium text-text-primary">
                    {row.reason}
                  </p>
                  <p className="mt-2 text-xs text-text-secondary">
                    Source: {row.cause.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="warning">
                    {row.cause.replace(/_/g, " ")}
                  </Badge>
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
