import {
  BellRing,
  Check,
  ChevronDown,
  Clock3,
  Droplets,
  ReceiptText,
  UtensilsCrossed,
  WifiOff,
} from "lucide-react";
import { Badge, Button } from "@pos/ui";
import type { CustomerOrder, CustomerRequestType } from "@/api";
import { formatMoney } from "@/shared/utils/money";
import { CUSTOMER_ORDER_TICKET_STEPS } from "./constants";

const statusLabel = (status: string) => {
  if (status === "SERVED") return "Served";
  if (status === "READY") return "Ready for you";
  if (status === "PREPARING") return "Preparing your food";
  return "Order received";
};

const orderStatusLabel = (status: "PAID" | "CLOSED" | "CANCELLED") => {
  if (status === "PAID") return "Paid";
  if (status === "CLOSED") return "Completed";
  return "Cancelled";
};

const serviceRequest = [
  { type: "CALL_WAITER", label: "Call waiter", icon: BellRing },
  { type: "WATER", label: "Water", icon: Droplets },
  { type: "CUTLERY", label: "Cutlery", icon: UtensilsCrossed },
  { type: "BILL", label: "Request bill", icon: ReceiptText },
] as const;

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
  const latestTicket = order.kitchenTickets.at(-1);
  const latestStatus = latestTicket?.status ?? "FIRED";
  const displayStatus =
    latestStatus === "PENDING_PAYMENT" ? "FIRED" : latestStatus;
  const activeStep = Math.max(
    0,
    CUSTOMER_ORDER_TICKET_STEPS.indexOf(displayStatus),
  );
  const terminal =
    order.status === "PAID" ||
    order.status === "CLOSED" ||
    order.status === "CANCELLED";
  const ready = latestStatus === "READY";
  const pendingPayment = order.payments?.some(
    (payment) => payment.method === "RAZORPAY" && payment.status === "PENDING",
  );

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
        {!terminal && (
          <section className="rounded-3xl bg-surface p-5 shadow-[0_16px_35px_rgba(7,35,20,0.18)] sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-text-secondary">Estimated ready</p>
                <p className="customer-display mt-1 text-2xl font-bold">
                  {estimatedTime}
                </p>
              </div>
              <p className="text-[10px] text-text-secondary">
                Updated just now
              </p>
            </div>
            <div
              className="relative mt-7 grid grid-cols-4"
              aria-label={`Latest kitchen status: ${statusLabel(latestStatus)}`}
            >
              <div className="absolute left-[12.5%] right-[12.5%] top-3 h-0.5 bg-border" />
              <div
                className="absolute left-[12.5%] top-3 h-0.5 bg-primary transition-all"
                style={{ width: `${(activeStep / 3) * 75}%` }}
              />
              {CUSTOMER_ORDER_TICKET_STEPS.map((step, index) => (
                <div
                  key={step}
                  className={`relative z-[1] text-center ${index === activeStep ? "text-text-primary" : "text-text-secondary"}`}
                >
                  <div
                    className={`mx-auto grid h-6 w-6 place-items-center rounded-full border-[3px] border-surface text-[10px] ${index <= activeStep ? "bg-primary text-primary-foreground" : "bg-border text-text-secondary"}`}
                  >
                    {index < activeStep ? <Check className="h-3 w-3" /> : null}
                  </div>
                  <p className="mt-2 text-[9px] font-bold sm:text-[10px]">
                    {step === "FIRED"
                      ? "Received"
                      : step === "PREPARING"
                        ? "Cooking"
                        : step[0] + step.slice(1).toLowerCase()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {ready && !terminal && (
          <section className="mt-4 flex items-center gap-3 rounded-2xl border border-success/30 bg-success-surface p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-success text-success-foreground">
              <BellRing className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold text-success">Your food is ready</p>
              <p className="mt-0.5 text-xs text-text-secondary">
                {mode === "DINE_IN"
                  ? "Your waiter will bring it to the table."
                  : "Show this screen at the pickup counter."}
              </p>
            </div>
          </section>
        )}

        {pendingPayment && onPay && (
          <section className="mt-4 rounded-2xl border border-primary bg-primary-surface p-4">
            <p className="font-bold">Complete payment</p>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              Payment is required before this takeaway order can enter the
              kitchen.
            </p>
            <Button
              variant="primary"
              size="lg"
              className="mt-3 w-full rounded-2xl"
              onClick={onPay}
              disabled={payBusy}
            >
              {payBusy
                ? "Opening payment…"
                : `Pay ${formatMoney(Number(order.totalAmount))}`}
            </Button>
          </section>
        )}

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

        <section id="customer-service" className="scroll-mt-4 pt-7">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="customer-display text-2xl font-bold">
              Need anything?
            </h2>
            <span className="text-xs text-text-secondary">
              We'll notify the team
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {serviceRequest
              .filter(({ type }) => mode === "DINE_IN" || type !== "BILL")
              .map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  disabled={requestBusy}
                  onClick={() => onRequest(type)}
                  className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-3 text-xs font-bold transition hover:border-primary/40 hover:bg-primary-surface disabled:opacity-50"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  {label}
                </button>
              ))}
          </div>
          {requestMessage && (
            <p
              role="status"
              className="mt-3 rounded-2xl bg-primary-surface px-4 py-3 text-sm text-primary"
            >
              {requestMessage}
            </p>
          )}
        </section>

        <details className="group mt-7 rounded-2xl border border-border bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-bold">
            <span>Order details</span>
            <span className="flex items-center gap-2 text-sm text-text-secondary">
              {formatMoney(Number(order.totalAmount))}
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <div className="border-t border-border px-4 pb-4">
            {(["DINE_IN", "TAKEAWAY"] as const).map((fulfillmentType) => {
              const items =
                order.items?.filter(
                  (item) => item.fulfillmentType === fulfillmentType,
                ) ?? [];
              if (!items.length) return null;
              return (
                <div key={fulfillmentType} className="pt-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-secondary">
                    {fulfillmentType === "DINE_IN" ? "Eat here" : "Takeaway"}
                  </p>
                  <div className="mt-2 divide-y divide-border">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold">
                            {item.quantity} × {item.menuItemName}
                          </p>
                          {item.variantName && (
                            <p className="mt-1 text-xs text-text-secondary">
                              {item.variantName}
                            </p>
                          )}
                          {item.modifiers?.length > 0 && (
                            <p className="mt-1 text-xs leading-5 text-text-secondary">
                              {item.modifiers
                                .map(
                                  (modifier) =>
                                    `${modifier.quantity > 1 ? `${modifier.quantity} × ` : ""}${modifier.name}`,
                                )
                                .join(", ")}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-sm font-bold">
                          {formatMoney(Number(item.subtotal))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="mt-2 border-t border-border pt-3 text-sm">
              <div className="flex justify-between py-1 text-text-secondary">
                <span>Subtotal</span>
                <span>{formatMoney(Number(order.subtotal))}</span>
              </div>
              <div className="flex justify-between py-1 text-text-secondary">
                <span>Tax</span>
                <span>{formatMoney(Number(order.taxAmount))}</span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between py-1 text-success">
                  <span>Discount</span>
                  <span>-{formatMoney(Number(order.discountAmount))}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatMoney(Number(order.totalAmount))}</span>
              </div>
            </div>
          </div>
        </details>

        {order.kitchenTickets.length > 1 && (
          <details className="group mt-3 rounded-2xl border border-border bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-bold">
              <span>Kitchen rounds</span>
              <ChevronDown className="h-4 w-4 text-text-secondary transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-2 border-t border-border p-4">
              {order.kitchenTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between rounded-xl bg-surface-secondary px-3 py-2 text-sm"
                >
                  <span>Round {ticket.ticketNumber}</span>
                  <Badge
                    variant={ticket.status === "SERVED" ? "success" : "default"}
                  >
                    {statusLabel(ticket.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </details>
        )}

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
