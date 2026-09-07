import { BellRing, Clock3, UtensilsCrossed, WifiOff } from "lucide-react";
import { Badge, Button } from "@pos/ui";
import type { CustomerOrder, CustomerRequestType } from "@/api";
import { OrderProgressPanel } from "./components/OrderProgressPanel";
import { ServiceRequests } from "./components/ServiceRequests";
import { OrderDetailsPanel } from "./components/OrderDetailsPanel";
import { orderStatusLabel, statusLabel } from "./order-status-utils";

export const OrderStatus = ({
  order,
  mode,
  table,
  estimatedTime,
  onMenu,
  live,
  onRequest,
  requestBusy,
  requestMessage,
  onPay,
  payBusy = false,
}: {
  order: CustomerOrder;
  mode: "DINE_IN" | "TAKEAWAY";
  table: string;
  estimatedTime: string;
  onMenu: () => void;
  live: boolean;
  onRequest: (type: CustomerRequestType) => void;
  requestBusy: boolean;
  requestMessage: string | null;
  onPay?: () => void;
  payBusy?: boolean;
}) => {
  const latestStatus = order.kitchenTickets.at(-1)?.status ?? "FIRED";
  const terminal =
    order.status === "PAID" ||
    order.status === "CLOSED" ||
    order.status === "CANCELLED";
  const ready = latestStatus === "READY";

  return (
    <main className="customer-experience min-h-screen bg-background pb-28 text-text-primary">
      <header className="bg-[#174d34] px-4 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))] text-white sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-white/65">
              {table === "Takeaway" ? "Takeaway" : `Table ${table}`} · Order #
              {order.id.slice(-6).toUpperCase()}
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-extrabold">
              {live ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#69df94]" />{" "}
                  Live
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" /> Reconnecting
                </>
              )}
            </span>
          </div>
          <h1 className="customer-display mt-6 text-4xl font-bold leading-none sm:text-5xl">
            {terminal
              ? order.status === "CANCELLED"
                ? "Order cancelled."
                : "All done."
              : ready
                ? mode === "DINE_IN"
                  ? "It's ready."
                  : "Ready for pickup."
                : latestStatus === "PREPARING"
                  ? "It's cooking."
                  : "Order received."}
          </h1>
          <p className="mt-3 text-sm text-white/70">
            {terminal
              ? `This order is ${orderStatusLabel(order.status as "PAID" | "CLOSED" | "CANCELLED").toLowerCase()}.`
              : ready
                ? mode === "DINE_IN"
                  ? "Your waiter has been notified."
                  : "Come by the pickup counter whenever you're ready."
                : "Your order is moving through the kitchen."}
          </p>
        </div>
      </header>
      <div className="mx-auto -mt-20 max-w-3xl px-4 sm:px-6">
        <OrderProgressPanel
          order={order}
          mode={mode}
          estimatedTime={estimatedTime}
          payBusy={payBusy}
          {...(onPay ? { onPay } : {})}
        />
        <section className="mt-5 rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#d45d24]">
                Current round
              </p>
              <p className="mt-1 font-bold">
                {order.items?.length ?? 0} items · {statusLabel(latestStatus)}
              </p>
            </div>
            <Badge variant={ready ? "success" : "default"}>
              {latestStatus.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="mt-3 text-xs leading-5 text-text-secondary">
            {(order.items ?? [])
              .slice(0, 3)
              .map((item) => `${item.quantity} × ${item.menuItemName}`)
              .join(" · ")}
          </p>
        </section>
        <ServiceRequests
          mode={mode}
          onRequest={onRequest}
          busy={requestBusy}
          message={requestMessage}
        />
        <OrderDetailsPanel order={order} />
        {!terminal && mode === "DINE_IN" && (
          <Button
            variant="primary"
            size="lg"
            onClick={onMenu}
            className="mt-5 w-full rounded-2xl"
          >
            Order more
          </Button>
        )}
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
        <div className="mx-auto grid max-w-sm grid-cols-3">
          <button
            type="button"
            onClick={onMenu}
            className="flex flex-col items-center gap-1 py-1 text-[10px] font-bold text-text-secondary"
          >
            <UtensilsCrossed className="h-5 w-5" /> Menu
          </button>
          <span className="flex flex-col items-center gap-1 py-1 text-[10px] font-bold text-primary">
            <Clock3 className="h-5 w-5" /> Order
          </span>
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("customer-service")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="flex flex-col items-center gap-1 py-1 text-[10px] font-bold text-text-secondary"
          >
            <BellRing className="h-5 w-5" /> Service
          </button>
        </div>
      </nav>
    </main>
  );
};
