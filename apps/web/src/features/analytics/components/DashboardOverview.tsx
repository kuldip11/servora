import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  RefreshCw,
  ShoppingBag,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge, Button, Card, Grid, SkeletonCard, StatCard } from "@pos/ui";
import { formatCurrency } from "@/shared/utils/format";
import { useDashboardStats } from "@/features/analytics/hooks/useDashboardStats";

export const DashboardOverview = ({ scopeLabel }: { scopeLabel: string }) => {
  const {
    data: stats,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useDashboardStats();
  const hasAttention =
    (stats?.lowStockAlerts ?? 0) > 0 || (stats?.activeOrders ?? 0) > 0;
  return (
    <>
      {isError ? (
        <Card className="border-danger/30 bg-danger-surface">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-danger">
                Dashboard data is temporarily unavailable
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Your operational pages are still available. Retry the owner
                summary when ready.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </Card>
      ) : null}
      {isLoading ? (
        <Grid columns={{ base: 1, sm: 2, lg: 4 }} gap="md">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </Grid>
      ) : (
        <Grid columns={{ base: 1, sm: 2, lg: 4 }} gap="md">
          <StatCard
            title="Orders today"
            value={stats?.totalOrdersToday ?? 0}
            icon={ShoppingBag}
            color="violet"
            subtitle="Placed since start of day"
          />
          <StatCard
            title="Revenue today"
            value={formatCurrency(stats?.revenueToday ?? 0)}
            icon={CircleDollarSign}
            color="emerald"
            subtitle="Captured from paid orders"
          />
          <StatCard
            title="Active orders"
            value={stats?.activeOrders ?? 0}
            icon={Clock}
            color="amber"
            subtitle="Currently in progress"
          />
          <StatCard
            title="Low stock"
            value={stats?.lowStockAlerts ?? 0}
            icon={AlertTriangle}
            color={stats?.lowStockAlerts ? "red" : "emerald"}
            subtitle="Items below threshold"
          />
        </Grid>
      )}
      {!isLoading && !isError ? (
        <>
          <Grid columns={{ base: 1, sm: 3 }} gap="md">
            <StatCard
              title="Average order"
              value={formatCurrency(stats?.averageOrderValue ?? 0)}
              icon={TrendingUp}
              color="violet"
              subtitle="Paid orders today"
            />
            <StatCard
              title="Paid orders"
              value={stats?.paidOrdersToday ?? 0}
              icon={CheckCircle2}
              color="emerald"
              subtitle="Completed payments today"
            />
            <StatCard
              title="Cancelled"
              value={stats?.cancelledOrdersToday ?? 0}
              icon={AlertTriangle}
              color={stats?.cancelledOrdersToday ? "red" : "emerald"}
              subtitle="Cancelled today"
            />
          </Grid>
          <Card className={hasAttention ? "border-warning/30" : undefined}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${hasAttention ? "bg-warning-surface text-warning" : "bg-success-surface text-success"}`}
                >
                  {hasAttention ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-text-primary">
                    {hasAttention
                      ? "Operations need attention"
                      : "Operations look clear"}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    {(stats?.activeOrders ?? 0) > 0
                      ? `${stats?.activeOrders ?? 0} active order${stats?.activeOrders === 1 ? "" : "s"}`
                      : "No active orders"}
                    {" · "}
                    {(stats?.lowStockAlerts ?? 0) > 0
                      ? `${stats?.lowStockAlerts ?? 0} low-stock alert${stats?.lowStockAlerts === 1 ? "" : "s"}`
                      : "No low-stock alerts"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/orders"
                  className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary"
                >
                  Review orders
                </Link>
                <Link
                  to="/inventory"
                  className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary"
                >
                  Review inventory
                </Link>
              </div>
            </div>
          </Card>
        </>
      ) : null}
    </>
  );
};
