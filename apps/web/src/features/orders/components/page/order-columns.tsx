import { Link } from "@tanstack/react-router";
import { Eye } from "lucide-react";
import {
  Badge,
  BUTTON_VARIANT_CLASSES,
  StatusBadge,
  type Column,
} from "@pos/ui";
import type { Order } from "@pos/types";
import { formatCurrency, formatTime } from "@/shared/utils/format";
import {
  getOrderStatusColor,
  getOrderStatusLabel,
} from "@/shared/utils/order-status";
import { ORDER_STATUS_TONE } from "@/features/orders/constants";

const KitchenStatus = ({ order }: { order: Order }) => {
  const tickets = order.kitchenTickets;
  if (!tickets?.length) return <span className="text-text-disabled">—</span>;
  if (tickets.some((ticket) => ticket.status === "READY")) {
    return <span className="text-success font-semibold text-xs">Ready</span>;
  }
  if (tickets.every((ticket) => ticket.status === "SERVED")) {
    return <span className="text-xs text-text-secondary">All served</span>;
  }
  return (
    <span className="text-xs text-text-secondary">
      {tickets.length} ticket{tickets.length > 1 ? "s" : ""}
    </span>
  );
};

export const ORDER_COLUMNS: Column<Order>[] = [
  {
    id: "id",
    header: "Order",
    sortable: true,
    sortValue: (row) => row.id,
    width: "140px",
    sticky: "left",
    cell: (row) => (
      <div>
        <p className="font-semibold text-text-primary">
          {row.table?.name
            ? `Table ${row.table.name}`
            : row.type?.replace("_", " ")}
        </p>
        <p className="font-mono text-[11px] text-text-disabled">
          #{row.id.slice(-8).toUpperCase()}
        </p>
      </div>
    ),
  },
  {
    id: "type",
    header: "Type",
    width: "110px",
    cell: (row) => (
      <StatusBadge
        label={row.type?.replace("_", " ") ?? ""}
        tone="neutral"
        dot={false}
      />
    ),
  },
  {
    id: "kitchen",
    header: "Kitchen",
    width: "100px",
    cell: (row) => <KitchenStatus order={row} />,
  },
  {
    id: "items",
    header: "Items",
    align: "right",
    width: "80px",
    cell: (row) => `${row.items?.length ?? 0} items`,
  },
  {
    id: "total",
    header: "Total",
    align: "right",
    sortable: true,
    width: "110px",
    sortValue: (row) => parseFloat(String(row.totalAmount)),
    cell: (row) => (
      <span className="font-semibold text-text-primary">
        {formatCurrency(parseFloat(String(row.totalAmount)))}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    width: "140px",
    cell: (row) => {
      const tone = ORDER_STATUS_TONE[row.status];
      return tone ? (
        <StatusBadge label={getOrderStatusLabel(row.status)} tone={tone} />
      ) : (
        <Badge className={getOrderStatusColor(row.status)}>
          {getOrderStatusLabel(row.status)}
        </Badge>
      );
    },
  },
  {
    id: "time",
    header: "Time",
    sortable: true,
    width: "90px",
    sortValue: (row) => new Date(row.createdAt).getTime(),
    cell: (row) => (
      <span className="text-text-secondary text-xs">
        {formatTime(row.createdAt)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    width: "80px",
    sticky: "right",
    cell: (row) => (
      <Link
        to="/orders/$orderId"
        params={{ orderId: row.id }}
        onClick={(event) => event.stopPropagation()}
        className={`${BUTTON_VARIANT_CLASSES.secondary} px-2 py-1.5 text-xs inline-flex items-center gap-1`}
      >
        <Eye className="w-3.5 h-3.5" /> View
      </Link>
    ),
  },
];
