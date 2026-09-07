import { TrendingUp } from "lucide-react";
import { Badge, Card, Grid } from "@pos/ui";
import { formatCurrency } from "@/shared/utils/format";
import { useDashboardStats } from "@/features/analytics/hooks/useDashboardStats";

export const DashboardSalesInsights = ({
  scopeLabel,
}: {
  scopeLabel: string;
}) => {
  const { data: stats } = useDashboardStats();
  return (
    <Grid columns={{ base: 1, lg: 2 }} gap="lg">
      <Card>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Top selling items
            </h2>
            <p className="mt-1 text-xs text-text-secondary">
              Today in {scopeLabel.toLowerCase()}
            </p>
          </div>
          <Badge variant="success">Live</Badge>
        </div>
        {!stats?.topItems?.length ? (
          <p className="py-8 text-center text-sm text-text-disabled">
            No item sales yet today
          </p>
        ) : (
          <div className="space-y-3">
            {stats.topItems.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-surface text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {item.name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {item.count} sold
                  </p>
                </div>
                <span className="text-sm font-semibold text-text-primary">
                  {formatCurrency(item.revenue)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Revenue by hour
            </h2>
            <p className="mt-1 text-xs text-text-secondary">
              Paid revenue today
            </p>
          </div>
          <TrendingUp className="h-4 w-4 text-success" />
        </div>
        {!stats?.revenueByHour?.length ? (
          <p className="py-8 text-center text-sm text-text-disabled">
            No paid revenue yet today
          </p>
        ) : (
          <div className="space-y-3">
            {stats.revenueByHour.map((point) => {
              const max = Math.max(
                ...stats.revenueByHour.map((entry) => entry.revenue),
                1,
              );
              const width = Math.max(
                4,
                Math.round((point.revenue / max) * 100),
              );
              return (
                <div
                  key={point.hour}
                  className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 text-xs"
                >
                  <span className="text-text-secondary">
                    {String(point.hour).padStart(2, "0")}:00
                  </span>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-surface-secondary"
                    role="presentation"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-fast"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="font-medium text-text-primary">
                    {formatCurrency(point.revenue)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </Grid>
  );
};
