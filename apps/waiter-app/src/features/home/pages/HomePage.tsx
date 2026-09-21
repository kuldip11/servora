import {
  ShoppingBag,
  CheckCircle2,
  Droplets,
  ReceiptText,
  Utensils,
} from "lucide-react";
import { QueryErrorState, StaleDataBanner, Card } from "@pos/ui";
import { extractApiError } from "@pos/api-client";
import { useOrders } from "@/features/orders";
import { OrderCard } from "@/features/orders";
import {
  useCustomerRequests,
  useResolveCustomerRequest,
} from "@/features/home/hooks/useCustomerRequests";

interface Props {
  onNewOrder: () => void;
  onViewOrders: () => void;
  onSelectOrder: (id: string) => void;
}

export const HomePage = ({
  onNewOrder,
  onViewOrders,
  onSelectOrder,
}: Props) => {
  const ordersQuery = useOrders({ view: "ACTIVE", limit: 100 });
  const requestsQuery = useCustomerRequests();
  const resolveRequest = useResolveCustomerRequest();
  const orders = ordersQuery.data;
  const requests = requestsQuery.data ?? [];
  const hasOrdersData = orders !== undefined;
  const hasRequestsData = requestsQuery.data !== undefined;
  const hasInitialAttentionError =
    (ordersQuery.isError && !hasOrdersData) ||
    (requestsQuery.isError && !hasRequestsData);
  const hasStaleAttentionError =
    (ordersQuery.isError && hasOrdersData) ||
    (requestsQuery.isError && hasRequestsData);

  const active =
    orders?.filter((o) => ["OPEN", "BILL_REQUESTED"].includes(o.status)) ?? [];
  const ready = active.filter((o) =>
    o.kitchenTickets?.some((t) => t.status === "READY"),
  );
  const billRequested = active.filter((o) => o.status === "BILL_REQUESTED");
  const visibleRequests = requests.filter(
    (request) =>
      request.type !== "BILL" ||
      !request.orderId ||
      !billRequested.some((order) => order.id === request.orderId),
  );
  const tableLabel = (tableId: string) =>
    tableId.length <= 8 ? tableId : tableId.slice(-4).toUpperCase();

  return (
    <div className="mx-auto h-full w-full max-w-2xl overflow-y-auto px-3.5 pb-6 pt-3.5 md:px-6 md:pt-6">
      <h1 className="text-[22px] font-medium text-text-primary">
        Good evening
      </h1>

      <div className="waiter-priority-strip mt-3.5 grid grid-cols-3 overflow-hidden rounded-[18px] text-white">
        {[
          [
            ordersQuery.isError && !hasOrdersData ? "—" : ready.length,
            "Ready now",
          ],
          [
            requestsQuery.isError && !hasRequestsData
              ? "—"
              : visibleRequests.length,
            "Requests",
          ],
          [
            ordersQuery.isError && !hasOrdersData ? "—" : active.length,
            "Active tables",
          ],
        ].map(([value, label], index) => (
          <div
            key={String(label)}
            className={`px-2 py-4 text-center ${index ? "border-l border-primary-foreground/15" : ""}`}
          >
            <strong className="block text-[22px] font-medium">{value}</strong>
            <span className="text-[11px] text-white/80">{label}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onNewOrder}
        className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary font-medium text-primary-foreground shadow-sm active:scale-[0.98]"
      >
        <ShoppingBag className="h-5 w-5" /> Start new order
      </button>

      <div className="mb-2 mt-6 flex items-center justify-between px-1">
        <h2 className="text-sm font-medium text-text-primary">
          Needs attention
        </h2>
        {active.length > 0 && (
          <button
            type="button"
            onClick={onViewOrders}
            className="min-h-10 px-2 text-xs font-semibold text-primary"
          >
            View all
          </button>
        )}
      </div>

      <div className="space-y-2">
        {hasStaleAttentionError ? (
          <StaleDataBanner
            className="rounded-2xl border"
            message="Attention data could not be refreshed — showing the latest information available."
            isRetrying={ordersQuery.isFetching || requestsQuery.isFetching}
            onRetry={() => {
              void ordersQuery.refetch();
              void requestsQuery.refetch();
            }}
          />
        ) : null}

        {hasInitialAttentionError ? (
          <QueryErrorState
            title="Unable to load attention items"
            description={extractApiError(
              ordersQuery.error ?? requestsQuery.error,
              "Orders or customer requests could not be loaded. Retry before relying on this screen.",
            )}
            isRetrying={ordersQuery.isFetching || requestsQuery.isFetching}
            onRetry={() => {
              void ordersQuery.refetch();
              void requestsQuery.refetch();
            }}
          />
        ) : null}

        {!hasInitialAttentionError
          ? ready
              .slice(0, 3)
              .map((order) => (
                <OrderCard
                  key={`ready-${order.id}`}
                  order={order}
                  onSelect={onSelectOrder}
                  variant="compact"
                />
              ))
          : null}

        {!hasInitialAttentionError
          ? visibleRequests.slice(0, 3).map((request) => (
              <Card
                key={request.id}
                padding="sm"
                className="grid min-h-[72px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning-surface text-warning">
                  {request.type === "WATER" ? (
                    <Droplets className="h-5 w-5" />
                  ) : request.type === "BILL" ? (
                    <ReceiptText className="h-5 w-5" />
                  ) : (
                    <Utensils className="h-5 w-5" />
                  )}
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-sm font-semibold">
                    {request.type.replace("_", " ").toLowerCase()} requested
                  </strong>
                  <span className="text-xs text-text-secondary">
                    Table {tableLabel(request.tableId)} · just now
                  </span>
                </span>
                <button
                  type="button"
                  disabled={
                    resolveRequest.isPending &&
                    resolveRequest.variables === request.id
                  }
                  onClick={() => resolveRequest.mutate(request.id)}
                  className="min-h-10 rounded-xl bg-primary-surface px-3 text-xs font-semibold text-primary"
                >
                  Done
                </button>
              </Card>
            ))
          : null}

        {!hasInitialAttentionError &&
          billRequested
            .filter((order) => !ready.some((item) => item.id === order.id))
            .slice(0, 2)
            .map((order) => (
              <OrderCard
                key={`bill-${order.id}`}
                order={order}
                onSelect={onSelectOrder}
                variant="compact"
              />
            ))}

        {!hasInitialAttentionError &&
          !ready.length &&
          !visibleRequests.length &&
          !billRequested.length && (
            <Card padding="lg" className="rounded-2xl text-center">
              <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-success" />
              <p className="text-sm font-semibold text-text-secondary">
                All caught up!
              </p>
              <p className="mt-1 text-xs text-text-disabled">
                Nothing needs your attention right now
              </p>
            </Card>
          )}
      </div>
    </div>
  );
};
