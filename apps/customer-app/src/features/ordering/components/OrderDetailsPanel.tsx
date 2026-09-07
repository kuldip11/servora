import { ChevronDown } from "lucide-react";
import { Badge } from "@pos/ui";
import type { CustomerOrder } from "@/api";
import { formatMoney } from "@/shared/utils/money";
import { statusLabel } from "../order-status-utils";
export const OrderDetailsPanel = ({ order }: { order: CustomerOrder }) => (
  <>
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
  </>
);
