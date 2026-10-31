import { memo } from "react";
import { Bell, ReceiptText } from "lucide-react";
import { Card } from "@pos/ui";
import type { OrderDto as Order } from "@pos/api-client";
import {
  shortOrderId,
  isOrderReady,
} from "@/features/orders/utils/orderHelpers";

interface Props {
  order: Order;
  onSelect: (id: string) => void;

  variant?: "compact" | "detailed";
}

export const OrderCard = memo(function OrderCard({
  order,
  onSelect,
  variant = "detailed",
}: Props) {
  const ready = isOrderReady(order);
  const tableName =
    order.table?.name ?? (order.type === "TAKEAWAY" ? "TA" : "Order");
  const elapsedMinutes = order.createdAt
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000),
      )
    : null;
  const attentionLabel = ready
    ? "Ready to serve"
    : order.status === "BILL_REQUESTED"
      ? "Bill requested"
      : "In progress";

  if (variant === "compact") {
    return (
      <Card
        as="button"
        onClick={() => onSelect(order.id)}
        padding="md"
        className={`grid min-h-[72px] w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl text-left transition-transform active:scale-[0.98] ${
          ready ? "border-success ring-1 ring-success/30" : ""
        }`}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-secondary text-xs font-semibold text-text-primary">
          {tableName}
        </span>
        <span className="min-w-0">
          <strong
            className={`flex items-center gap-1.5 truncate text-sm font-medium ${ready ? "text-success" : order.status === "BILL_REQUESTED" ? "text-warning" : "text-text-primary"}`}
          >
            {ready ? (
              <Bell className="h-4 w-4 shrink-0" />
            ) : order.status === "BILL_REQUESTED" ? (
              <ReceiptText className="h-4 w-4 shrink-0" />
            ) : null}
            {attentionLabel}
          </strong>
          <span className="mt-1 block truncate text-xs text-text-secondary">
            {shortOrderId(order.id)} · {order.items?.length ?? 0} items
            {elapsedMinutes !== null ? ` · ${elapsedMinutes} min` : ""}
          </span>
        </span>
        <span className="flex min-h-[38px] items-center gap-1 rounded-xl bg-primary-surface px-3 text-xs font-medium text-primary">
          {ready
            ? "Serve"
            : order.status === "BILL_REQUESTED"
              ? "Open"
              : "View"}
        </span>
      </Card>
    );
  }

  return (
    <Card
      as="button"
      onClick={() => onSelect(order.id)}
      padding="sm"
      className="grid min-h-[70px] w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-[11px] rounded-2xl text-left transition-transform active:scale-[0.98]"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-surface-secondary text-xs font-medium text-text-primary">
        {tableName}
      </span>
      <span className="min-w-0">
        <strong
          className={`block truncate text-sm font-medium ${ready ? "text-success" : order.status === "BILL_REQUESTED" ? "text-warning" : "text-text-primary"}`}
        >
          {attentionLabel}
        </strong>
        <span className="mt-1 block truncate text-xs text-text-secondary">
          {shortOrderId(order.id)} · {order.items?.length ?? 0} items
          {elapsedMinutes !== null ? ` · ${elapsedMinutes} min` : ""}
        </span>
      </span>
      <span className="flex min-h-[38px] items-center rounded-xl bg-primary-surface px-3 text-xs font-medium text-primary">
        {ready ? "Serve" : order.status === "BILL_REQUESTED" ? "Open" : "View"}
      </span>
    </Card>
  );
});
