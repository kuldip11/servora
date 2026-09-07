import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge, Button, Card, SkeletonCard, StatusBadge } from "@pos/ui";
import { formatCurrency, formatTime } from "@/shared/utils/format";
import {
  getOrderStatusColor,
  getOrderStatusLabel,
} from "@/shared/utils/order-status";
import { useOrders } from "@/features/orders/hooks/useOrders";
import { ANALYTICS_STATUS_TONE } from "@/features/analytics/constants";
export const ActiveOrdersPanel = () => {
  const {
    data: orders,
    isLoading,
    isError,
    refetch,
  } = useOrders({ status: "OPEN", limit: 100 });
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Active orders
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Orders that still need operational follow-through
          </p>
        </div>
        <Badge variant="info">{orders?.length ?? 0} orders</Badge>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="py-8 text-center">
          <p className="text-sm text-text-secondary">
            Active orders could not be loaded.
          </p>
          <Button
            className="mt-3"
            variant="secondary"
            onClick={() => void refetch()}
          >
            Retry orders
          </Button>
        </div>
      ) : !orders?.length ? (
        <div className="py-8 text-center text-text-disabled">
          <CheckCircle2 className="mx-auto mb-2 h-10 w-10 opacity-50" />
          <p className="text-sm">No active orders right now</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.slice(0, 5).map((order) => {
            const tone = ANALYTICS_STATUS_TONE[order.status];
            return (
              <Link
                key={order.id}
                to="/orders/$orderId"
                params={{ orderId: order.id }}
                className="flex items-center justify-between gap-4 rounded-md bg-surface-secondary p-3 transition-colors duration-fast ease-standard hover:bg-border"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    Order #{order.id.slice(-6).toUpperCase()}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {order.items?.length ?? 0} items ·{" "}
                    {formatTime(order.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {tone ? (
                    <StatusBadge
                      tone={tone}
                      label={getOrderStatusLabel(order.status)}
                    />
                  ) : (
                    <Badge className={getOrderStatusColor(order.status)}>
                      {getOrderStatusLabel(order.status)}
                    </Badge>
                  )}
                  <span className="text-sm font-semibold text-text-primary">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </Link>
            );
          })}
          {orders.length > 5 ? (
            <Link
              to="/orders"
              className="flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary"
            >
              View all active orders <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          ) : null}
        </div>
      )}
    </Card>
  );
};
