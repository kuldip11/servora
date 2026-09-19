import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Card,
  Page,
  PageHeader,
  QueryErrorState,
  Spinner,
  StaleDataBanner,
} from "@pos/ui";
import { operationsService } from "@/features/operations/services/operations.service";
import { extractApiError } from "@/shared/lib/api-client";

const capabilityScore = (
  branch: Awaited<
    ReturnType<typeof operationsService.snapshot>
  >["branches"][number],
) => {
  const enabled = [
    branch.dineInEnabled,
    branch.takeawayEnabled,
    branch.deliveryEnabled,
    branch.onlineEnabled,
  ].filter(Boolean).length;
  return Math.round((enabled / 4) * 100);
};

export const BranchHealthPage = () => {
  const snapshot = useQuery({
    queryKey: ["operations", "branch-health"],
    queryFn: operationsService.snapshot,
    refetchInterval: 60_000,
  });

  const exceptionsByBranch = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of snapshot.data?.availability ?? []) {
      map.set(row.branchId, (map.get(row.branchId) ?? 0) + 1);
    }
    return map;
  }, [snapshot.data]);

  return (
    <Page>
      <PageHeader
        title="Branch health"
        description="Branch readiness combines configured operating capabilities with live availability exceptions. Scores are transparent and never inferred from unavailable telemetry."
      />
      {snapshot.isError && snapshot.data !== undefined ? (
        <StaleDataBanner
          message="Branch health refresh failed — showing the latest readiness data available."
          isRetrying={snapshot.isFetching}
          onRetry={() => void snapshot.refetch()}
        />
      ) : null}
      {snapshot.isLoading ? (
        <div className="flex min-h-48 items-center justify-center">
          <Spinner className="h-7 w-7" />
        </div>
      ) : snapshot.isError && snapshot.data === undefined ? (
        <QueryErrorState
          title="Unable to load branch health"
          description={extractApiError(
            snapshot.error,
            "Branch readiness could not be loaded. Retry before relying on these operational indicators.",
          )}
          isRetrying={snapshot.isFetching}
          onRetry={() => void snapshot.refetch()}
        />
      ) : snapshot.data ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {snapshot.data.branches.map((branch) => {
            const capability = capabilityScore(branch);
            const exceptions = exceptionsByBranch.get(branch.id) ?? 0;
            const readiness = Math.max(
              0,
              capability - Math.min(40, exceptions * 5),
            );
            const variant: "danger" | "success" | "warning" = !branch.isActive
              ? "danger"
              : readiness >= 80
                ? "success"
                : readiness >= 60
                  ? "warning"
                  : "danger";
            return (
              <Card key={branch.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-text-primary">
                      {branch.name}
                    </h2>
                    <p className="mt-1 text-xs text-text-secondary">
                      {branch.code} · {branch.timezone}
                    </p>
                  </div>
                  <Badge variant={variant}>
                    {branch.isActive ? `${readiness}% ready` : "Inactive"}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <span className="text-text-secondary">Live exceptions</span>
                    <strong className="block text-text-primary">
                      {exceptions}
                    </strong>
                  </div>
                  <div>
                    <span className="text-text-secondary">KDS</span>
                    <strong className="block text-text-primary">
                      {branch.kdsEnabled ? "Enabled" : "Disabled"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-text-secondary">Waiter app</span>
                    <strong className="block text-text-primary">
                      {branch.waiterAppEnabled ? "Enabled" : "Disabled"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-text-secondary">Dine in</span>
                    <strong className="block text-text-primary">
                      {branch.dineInEnabled ? "Enabled" : "Disabled"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-text-secondary">Delivery</span>
                    <strong className="block text-text-primary">
                      {branch.deliveryEnabled ? "Enabled" : "Disabled"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-text-secondary">Online</span>
                    <strong className="block text-text-primary">
                      {branch.onlineEnabled ? "Enabled" : "Disabled"}
                    </strong>
                  </div>
                </div>
                <p className="mt-4 rounded-lg bg-surface-secondary p-3 text-xs text-text-secondary">
                  Readiness = enabled service capability coverage minus a
                  bounded penalty for current availability exceptions. It does
                  not claim device connectivity that Servora has not measured.
                </p>
              </Card>
            );
          })}
        </div>
      ) : null}
    </Page>
  );
};

export default BranchHealthPage;
