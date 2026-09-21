import { useEffect, useRef, useState } from "react";
import { ClipboardList } from "lucide-react";
import { Spinner, EmptyState } from "@pos/ui";
import { useInfiniteOrders } from "@/features/orders";
import { OrderCard } from "@/features/orders";

interface Props {
  onSelectOrder: (id: string) => void;
}

export const OrdersPage = ({ onSelectOrder }: Props) => {
  const [filter, setFilter] = useState<"ready" | "active" | "all">("ready");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const {
    data: result,
    isLoading,
    isFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteOrders({
    view: filter.toUpperCase() as "READY" | "ACTIVE" | "ALL",
    limit: 20,
  });
  const display = result?.pages.flatMap((page) => page.items) ?? [];
  const total = result?.pages[0]?.pagination.total ?? 0;
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry?.isIntersecting && void fetchNextPage(),
      { rootMargin: "280px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
      <div className="px-3.5 pb-1 pt-3.5">
        <h1 className="text-[22px] font-medium text-text-primary">Orders</h1>
      </div>

      <div className="flex gap-[7px] px-3.5 py-3">
        {(["ready", "active", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
            }}
            className={`min-h-10 flex-1 rounded-xl border px-3 text-xs font-medium transition-colors ${
              filter === f
                ? "border-primary bg-primary-surface text-primary"
                : "border-border bg-surface text-text-secondary"
            }`}
          >
            {f === filter
              ? `${f[0]!.toUpperCase()}${f.slice(1)} ${total.toLocaleString()}`
              : `${f[0]!.toUpperCase()}${f.slice(1)}`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading || (isFetching && display.length === 0) ? (
          <div className="flex justify-center py-12">
            <Spinner className="w-6 h-6" />
          </div>
        ) : display.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No orders"
            description={
              filter === "active"
                ? "No active orders right now"
                : filter === "ready"
                  ? "Nothing is waiting to be served"
                  : "No orders placed yet"
            }
          />
        ) : (
          <div className="space-y-2 px-3.5 pb-5 pt-1">
            {display.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onSelect={onSelectOrder}
                variant="detailed"
              />
            ))}
            {hasNextPage && (
              <div
                ref={sentinelRef}
                className="flex justify-center py-5 text-xs text-text-secondary"
              >
                {isFetchingNextPage ? (
                  <Spinner className="h-5 w-5" />
                ) : (
                  "Scroll for more orders"
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
