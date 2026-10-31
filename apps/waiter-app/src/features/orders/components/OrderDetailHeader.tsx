import { ArrowLeft } from "lucide-react";
import { IconButton } from "@pos/ui";
import type { OrderDto as Order } from "@pos/api-client";
import { StatusBadge } from "./StatusBadge";
import { shortOrderId } from "@/features/orders/utils/orderHelpers";

interface Props {
  order: Order;
  onBack: () => void;
}

export const OrderDetailHeader = ({ order, onBack }: Props) => {
  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 safe-area-top">
      <IconButton
        icon={ArrowLeft}
        aria-label="Back to Orders"
        size="lg"
        className="h-10 w-10 rounded-xl bg-surface-secondary hover:bg-surface-secondary"
        onClick={onBack}
      />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold text-text-primary">
          {shortOrderId(order.id)}
        </h1>
        <p className="truncate text-xs text-text-secondary">
          {order.type?.replace("_", " ")}
          {order.table ? ` · Table ${order.table.name}` : ""}
        </p>
      </div>
      <StatusBadge status={order.status} />
    </div>
  );
};
