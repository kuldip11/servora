import { BellRing, Check } from "lucide-react";
import { Badge, Button } from "@pos/ui";
import type { CustomerOrder } from "@/api";
import { formatMoney } from "@/shared/utils/money";
import { CUSTOMER_ORDER_TICKET_STEPS } from "../constants";
import { statusLabel } from "../order-status-utils";

export const OrderProgressPanel = ({
  order,
  mode,
  estimatedTime,
  onPay,
  payBusy,
}: {
  order: CustomerOrder;
  mode: "DINE_IN" | "TAKEAWAY";
  estimatedTime: string;
  onPay?: () => void;
  payBusy: boolean;
}) => {
  const latestStatus = order.kitchenTickets.at(-1)?.status ?? "FIRED";
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
    <>
      {!terminal && (
        <section className="rounded-3xl bg-surface p-5 shadow-[0_16px_35px_rgba(7,35,20,0.18)] sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-text-secondary">Estimated ready</p>
              <p className="customer-display mt-1 text-2xl font-bold">
                {estimatedTime}
              </p>
            </div>
            <p className="text-[10px] text-text-secondary">Updated just now</p>
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
    </>
  );
};
