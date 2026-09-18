import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Badge, Button, Card, Grid, Page, PageHeader, Spinner, StatCard } from "@pos/ui";
import { Activity, AlertTriangle, GitBranch, Package } from "lucide-react";
import { operationsService } from "@/features/operations/services/operations.service";
import { OperationalAlertCard, type OperationalAlert } from "@/features/operations/components/OperationalAlertCard";
import { useRealtimeEvent } from "@/shared/lib/realtime";

export const OperationsCenterPage = () => {
  const snapshot = useQuery({
    queryKey: ["operations", "snapshot"],
    queryFn: operationsService.snapshot,
    refetchInterval: 60_000,
  });

  useRealtimeEvent("order.updated", () => void snapshot.refetch());
  useRealtimeEvent("menu.availability.updated", () => void snapshot.refetch());
  useRealtimeEvent("inventory.low_stock", () => void snapshot.refetch());

  const alerts = useMemo<OperationalAlert[]>(() => {
    if (!snapshot.data) return [];
    const next: OperationalAlert[] = [];
    const { dashboard, branches, availability } = snapshot.data;

    if (dashboard.lowStockAlerts > 0) {
      next.push({
        id: "low-stock",
        title: `${dashboard.lowStockAlerts} low-stock alert${dashboard.lowStockAlerts === 1 ? "" : "s"}`,
        description: "Inventory has reached or fallen below configured minimum stock levels.",
        severity: dashboard.lowStockAlerts >= 5 ? "critical" : "warning",
        meta: "Source: authoritative inventory levels",
        action: <Link to="/inventory" className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary transition hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary">Review inventory</Link>,
      });
    }

    if (dashboard.cancelledOrdersToday > 0) {
      next.push({
        id: "cancelled-orders",
        title: `${dashboard.cancelledOrdersToday} cancelled order${dashboard.cancelledOrdersToday === 1 ? "" : "s"} today`,
        description: "Review cancellation patterns and operational causes before they repeat.",
        severity: dashboard.cancelledOrdersToday >= 5 ? "critical" : "warning",
        meta: "Source: order analytics for the current scope",
        action: <Link to="/orders" className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary transition hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary">Review orders</Link>,
      });
    }

    const groupedAvailability = new Map<string, typeof availability>();
    for (const item of availability) {
      const rows = groupedAvailability.get(item.branchId) ?? [];
      rows.push(item);
      groupedAvailability.set(item.branchId, rows);
    }
    for (const [branchId, rows] of groupedAvailability) {
      const branchName = branches.find((branch) => branch.id === branchId)?.name ?? "Current branch";
      next.push({
        id: `availability-${branchId}`,
        title: `${rows.length} availability exception${rows.length === 1 ? "" : "s"} · ${branchName}`,
        description: rows.slice(0, 3).map((row) => row.name).join(", ") + (rows.length > 3 ? ` +${rows.length - 3} more` : ""),
        severity: rows.some((row) => row.status === "OUT_OF_STOCK") ? "warning" : "info",
        meta: "Source: AvailabilityResolver dashboard",
        action: <Link to="/availability" className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary transition hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary">Explain availability</Link>,
      });
    }

    if (next.length === 0) {
      next.push({
        id: "healthy",
        title: "No operational exceptions detected",
        description: "Orders, inventory thresholds and menu availability are currently within configured operating rules.",
        severity: "success",
        meta: "Signals refresh automatically and on realtime events.",
      });
    }
    return next;
  }, [snapshot.data]);

  if (snapshot.isLoading && !snapshot.data) {
    return <div className="flex min-h-64 items-center justify-center"><Spinner className="h-7 w-7" /></div>;
  }

  return (
    <Page>
      <PageHeader
        title="Operations center"
        description="A live, evidence-based view of operational exceptions across orders, inventory and menu availability."
        actions={<Button variant="secondary" loading={snapshot.isFetching} onClick={() => void snapshot.refetch()}>Refresh signals</Button>}
      />

      {snapshot.error ? (
        <Card className="border-danger/30 bg-danger-surface">
          <p className="font-semibold text-danger">Operations snapshot unavailable</p>
          <p className="mt-1 text-sm text-text-secondary">Some source systems could not be queried. Retry before acting on this view.</p>
        </Card>
      ) : null}

      {snapshot.data ? (
        <>
          <Grid columns={{ base: 1, sm: 2, lg: 4 }} gap="md">
            <StatCard title="Active orders" value={snapshot.data.dashboard.activeOrders} icon={Activity} color="blue" />
            <StatCard title="Low stock" value={snapshot.data.dashboard.lowStockAlerts} icon={Package} color="amber" />
            <StatCard title="Availability exceptions" value={snapshot.data.availability.length} icon={AlertTriangle} color="red" />
            <StatCard title="Active branches" value={snapshot.data.branches.filter((branch) => branch.isActive).length} icon={GitBranch} color="emerald" />
          </Grid>

          <div className="mt-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Action queue</h2>
              <p className="text-sm text-text-secondary">Prioritized from authoritative Servora data, not synthetic demo alerts.</p>
            </div>
            <Badge variant={alerts.some((alert) => alert.severity === "critical") ? "danger" : alerts.some((alert) => alert.severity === "warning") ? "warning" : "success"}>
              {alerts.length} signal{alerts.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <div className="mt-3 space-y-3">
            {alerts.map((alert) => <OperationalAlertCard key={alert.id} alert={alert} />)}
          </div>
        </>
      ) : null}
    </Page>
  );
};

export default OperationsCenterPage;
