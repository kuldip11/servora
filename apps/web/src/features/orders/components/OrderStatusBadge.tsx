import { Badge, StatusBadge } from "@pos/ui";
import {
  getOrderStatusColor,
  getOrderStatusLabel,
} from "@/shared/utils/order-status";

const STATUS_TONE: Partial<
  Record<string, "info" | "warning" | "neutral" | "danger">
> = {
  OPEN: "info",
  BILL_REQUESTED: "warning",
  CLOSED: "neutral",
  CANCELLED: "danger",
};

export const OrderStatusBadge = ({ status }: { status: string }) => {
  const tone = STATUS_TONE[status];
  if (!tone) {
    return (
      <Badge className={getOrderStatusColor(status)}>
        {getOrderStatusLabel(status)}
      </Badge>
    );
  }
  return <StatusBadge label={getOrderStatusLabel(status)} tone={tone} />;
};
