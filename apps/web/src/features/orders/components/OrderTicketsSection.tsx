import { CheckCircle2, RotateCcw } from "lucide-react";
import { Button, Card, StatusBadge } from "@pos/ui";
import type { Order } from "@pos/types";
import { formatCurrency } from "@/shared/utils/format";
import { useUpdateTicketStatus } from "@/features/orders/hooks/useUpdateTicketStatus";
import { useVoidOrderItem } from "@/features/orders/hooks/useVoidOrderItem";
import { useCompOrderItem } from "@/features/orders/hooks/useCompOrderItem";

const TICKET_STATUS_TONE: Record<
  string,
  "info" | "warning" | "success" | "neutral"
> = {
  HELD: "neutral",
  FIRED: "info",
  PREPARING: "warning",
  READY: "success",
  SERVED: "neutral",
};

type TicketMutation = ReturnType<typeof useUpdateTicketStatus>;
type VoidMutation = ReturnType<typeof useVoidOrderItem>;
type CompMutation = ReturnType<typeof useCompOrderItem>;

type SeatShareTarget = {
  itemId: string;
  shares: Array<{ seatLabel: string; shareRatio: string | number }>;
};

interface OrderTicketsSectionProps {
  order: Order;
  canFire: boolean;
  canKitchen: boolean;
  canServe: boolean;
  hasPermission: (permission: string) => boolean;
  updateTicketMutation: TicketMutation;
  voidItemMutation: VoidMutation;
  compItemMutation: CompMutation;
  onRefire: (itemId: string) => void;
  onSeatShare: (target: SeatShareTarget) => void;
  onVoid: (itemId: string) => void;
  onComp: (itemId: string) => void;
}

export const OrderTicketsSection = ({
  order,
  canFire,
  canKitchen,
  canServe,
  hasPermission,
  updateTicketMutation,
  voidItemMutation,
  compItemMutation,
  onRefire,
  onSeatShare,
  onVoid,
  onComp,
}: OrderTicketsSectionProps) => {
  const replacementByOriginalId = new Map<string, { id: string }>(
    (order.items ?? []).flatMap((item) =>
      item.refiresOrderItemId
        ? [[item.refiresOrderItemId, { id: item.id }] as const]
        : [],
    ),
  );

  return (
    <>
      {(order.kitchenTickets ?? []).map((ticket) => (
        <Card key={ticket.id}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-text-primary">
              {ticket.course
                ? `Course ${ticket.course.courseNumber}${ticket.course.name ? ` · ${ticket.course.name}` : ""}`
                : `Round ${ticket.ticketNumber}`}
            </h2>
            <div className="flex items-center gap-2">
              <StatusBadge
                label={
                  ticket.status.charAt(0) + ticket.status.slice(1).toLowerCase()
                }
                tone={TICKET_STATUS_TONE[ticket.status] ?? "neutral"}
              />
              {ticket.status === "HELD" && canFire && (
                <Button
                  variant="primary"
                  size="sm"
                  loading={
                    updateTicketMutation.isPending &&
                    updateTicketMutation.variables?.ticketId === ticket.id
                  }
                  onClick={() =>
                    updateTicketMutation.mutate({
                      ticketId: ticket.id,
                      status: "FIRED",
                    })
                  }
                >
                  Fire Course Now
                </Button>
              )}
              {ticket.status === "FIRED" && canKitchen && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={
                    updateTicketMutation.isPending &&
                    updateTicketMutation.variables?.ticketId === ticket.id
                  }
                  onClick={() =>
                    updateTicketMutation.mutate({
                      ticketId: ticket.id,
                      status: "PREPARING",
                    })
                  }
                >
                  Start Preparing
                </Button>
              )}
              {ticket.status === "PREPARING" && canKitchen && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={
                    updateTicketMutation.isPending &&
                    updateTicketMutation.variables?.ticketId === ticket.id
                  }
                  onClick={() =>
                    updateTicketMutation.mutate({
                      ticketId: ticket.id,
                      status: "READY",
                    })
                  }
                >
                  Mark Ready
                </Button>
              )}
              {ticket.status === "READY" && canServe && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={
                    updateTicketMutation.isPending &&
                    updateTicketMutation.variables?.ticketId === ticket.id
                  }
                  onClick={() =>
                    updateTicketMutation.mutate({
                      ticketId: ticket.id,
                      status: "SERVED",
                    })
                  }
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Mark Served
                </Button>
              )}
            </div>
          </div>

          {ticket.notes && (
            <p className="text-xs text-warning bg-warning-surface rounded px-2 py-1.5 mb-3">
              📝 {ticket.notes}
            </p>
          )}

          <div className="space-y-3">
            {ticket.items?.map((item) => (
              <div
                key={item.id}
                className={`flex items-start justify-between py-2 border-b border-divider last:border-0 ${item.itemStatus === "VOIDED" ? "opacity-60 line-through" : ""}`}
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {item.quantity}× {item.menuItemName}
                    {item.variantName && (
                      <span className="text-text-secondary font-normal">
                        {" "}
                        · {item.variantName}
                      </span>
                    )}
                  </p>
                  {item.chefNotes && (
                    <p className="text-xs text-warning mt-0.5">
                      📝 {item.chefNotes}
                    </p>
                  )}
                  {item.station?.name && (
                    <p className="text-xs text-text-secondary">
                      Prepared at {item.station.name}
                    </p>
                  )}
                  {item.itemStatus === "VOIDED" && (
                    <p className="text-xs text-danger no-underline">
                      Voided{item.voidedReason ? ` · ${item.voidedReason}` : ""}
                    </p>
                  )}
                  {item.itemStatus === "REFIRED" && (
                    <p className="text-xs font-semibold text-warning">
                      Refired → replacement #
                      {replacementByOriginalId.get(item.id)?.id.slice(-6) ??
                        "pending"}
                      {item.refireReason ? ` · ${item.refireReason}` : ""}
                      {item.compedAt ? " · original comped" : ""}
                    </p>
                  )}
                  {item.refiresOrderItemId && (
                    <p className="text-xs font-semibold text-warning">
                      REFIRE replacement of #{item.refiresOrderItemId.slice(-6)}
                    </p>
                  )}
                  {item.itemStatus === "COMPED" && (
                    <p className="text-xs text-success">
                      Comped{item.compedReason ? ` · ${item.compedReason}` : ""}
                    </p>
                  )}
                  {item.modifiers?.map((modifier) => (
                    <p
                      key={modifier.modifierId}
                      className="text-xs text-text-secondary"
                    >
                      + {modifier.name}
                      {modifier.quantity > 1 ? ` ×${modifier.quantity}` : ""}
                    </p>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-text-primary">
                    {formatCurrency(parseFloat(String(item.subtotal)))}
                  </p>
                  {order.status === "OPEN" &&
                    item.itemStatus === "ACTIVE" &&
                    item.menuItemId &&
                    hasPermission("orders:update") && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onRefire(item.id)}
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Refire
                      </Button>
                    )}
                  {order.status === "OPEN" &&
                    item.itemStatus === "ACTIVE" &&
                    hasPermission("billing:create") && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          onSeatShare({
                            itemId: item.id,
                            shares: item.seatShares ?? [],
                          })
                        }
                      >
                        Split across seats
                      </Button>
                    )}
                  {order.status === "OPEN" &&
                    item.itemStatus === "ACTIVE" &&
                    hasPermission("orders:void") && (
                      <Button
                        size="sm"
                        variant="danger"
                        loading={voidItemMutation.isPending}
                        onClick={() => onVoid(item.id)}
                      >
                        Void
                      </Button>
                    )}
                  {order.status === "OPEN" &&
                    item.itemStatus === "ACTIVE" &&
                    hasPermission("orders:comp") && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={compItemMutation.isPending}
                        onClick={() => onComp(item.id)}
                      >
                        Comp
                      </Button>
                    )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </>
  );
};
