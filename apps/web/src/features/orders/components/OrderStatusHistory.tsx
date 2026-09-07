import { Clock } from "lucide-react";
import { Card } from "@pos/ui";
import type { Order } from "@pos/types";
import { formatTime } from "@/shared/utils/format";
import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge";

export const OrderStatusHistory = ({ order }: { order: Order }) => (
  <Card>
    <h2 className="text-base font-semibold text-text-primary mb-4">
      Status History
    </h2>
    <div className="space-y-2">
      {order.statusHistory?.map((entry) => (
        <div key={entry.id} className="flex items-center gap-3 text-sm">
          <Clock className="w-4 h-4 text-text-disabled flex-shrink-0" />
          <span className="text-text-secondary">
            {formatTime(entry.changedAt)}
          </span>
          <OrderStatusBadge status={entry.newStatus} />
          {entry.reason && (
            <span className="text-text-disabled text-xs">· {entry.reason}</span>
          )}
          {entry.cancellationReason?.label && (
            <span className="text-text-disabled text-xs">
              · {entry.cancellationReason.label}
            </span>
          )}
        </div>
      ))}
    </div>
  </Card>
);
