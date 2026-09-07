import type { KitchenTicket, OrderItemFulfillmentType } from "@pos/types";
import { CheckCircle2, RotateCcw } from "lucide-react";
import {
  Card,
  Button,
  StatusBadge as SharedStatusBadge,
  type StatusTone,
} from "@pos/ui";
import { TICKET_STATUS_LABEL } from "@/features/orders/constants";
import { formatCurrency } from "@/features/orders/utils/orderHelpers";

interface Props {
  ticket: KitchenTicket;
  onMarkServed?: ((ticketId: string) => void) | undefined;
  isUpdating: boolean;
  canVoid?: boolean;
  canComp?: boolean;
  onAdjust?: (itemId: string, action: "void" | "comp") => void;
  onFireHeld?: ((ticketId: string) => void) | undefined;
  onRefire?: ((itemId: string) => void) | undefined;
  onRefill?: ((itemId: string) => void) | undefined;
  onSeatShares?:
    | ((
        itemId: string,
        current: Array<{ seatLabel: string; shareRatio: number | string }>,
      ) => void)
    | undefined;
  replacementByOriginalId?: ReadonlyMap<string, { id: string }>;
}

const TICKET_STATUS_TONE: Record<string, StatusTone> = {
  HELD: "neutral",
  FIRED: "info",
  PREPARING: "warning",
  READY: "success",
  SERVED: "neutral",
};

export const TicketGroup = ({
  ticket,
  onMarkServed,
  isUpdating,
  canVoid,
  canComp,
  onAdjust,
  onFireHeld,
  onRefire,
  onRefill,
  onSeatShares,
  replacementByOriginalId,
}: Props) => {
  return (
    <Card padding="none" className="mx-4 mt-4 rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-divider flex items-center justify-between">
        <p className="text-xs font-semibold text-text-disabled uppercase tracking-wide">
          {ticket.course
            ? `Course ${ticket.course.courseNumber}${ticket.course.name ? ` · ${ticket.course.name}` : ""}`
            : `Round ${ticket.ticketNumber}`}
        </p>
        <SharedStatusBadge
          label={TICKET_STATUS_LABEL[ticket.status] ?? ticket.status}
          tone={TICKET_STATUS_TONE[ticket.status] ?? "neutral"}
        />
      </div>
      {ticket.notes && (
        <p className="px-4 py-2 text-xs text-warning bg-warning-surface border-b border-divider">
          📝 {ticket.notes}
        </p>
      )}
      {(["DINE_IN", "TAKEAWAY"] as OrderItemFulfillmentType[]).map(
        (fulfillmentType) => {
          const group = ticket.items.filter(
            (item) => (item.fulfillmentType ?? "DINE_IN") === fulfillmentType,
          );
          if (!group.length) return null;
          return (
            <div key={fulfillmentType}>
              <div className="px-4 py-2 bg-surface-secondary border-b border-divider flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">
                  {fulfillmentType === "DINE_IN" ? "Dine-in" : "Takeaway"}
                </span>
                <span className="h-px flex-1 bg-divider" />
              </div>
              {group.map((item, idx) => (
                <div
                  key={item.id}
                  className={`px-4 py-3 flex items-start gap-3 ${idx < group.length - 1 ? "border-b border-divider" : ""} ${item.itemStatus === "VOIDED" ? "opacity-60 line-through" : ""}`}
                >
                  <span className="w-6 h-6 bg-primary-surface text-primary rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {item.quantity}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-primary">
                      {item.menuItemName}
                      {item.variantName && (
                        <span className="text-text-disabled font-normal">
                          {" "}
                          · {item.variantName}
                        </span>
                      )}
                    </p>
                    {item.weightQuantity != null && (
                      <p className="text-xs text-text-secondary">
                        {Number(item.weightQuantity)} {item.weightUnit ?? ""}
                      </p>
                    )}
                    {item.modifiers?.map((m) => (
                      <p
                        key={`${m.modifierId}:${m.zoneLabel ?? "WHOLE"}`}
                        className="text-xs text-text-disabled"
                      >
                        +{" "}
                        {m.zoneLabel && m.zoneLabel !== "WHOLE"
                          ? `${m.zoneLabel}: `
                          : ""}
                        {m.name}
                      </p>
                    ))}
                    {item.chefNotes && (
                      <p className="text-xs text-warning mt-0.5">
                        📝 {item.chefNotes}
                      </p>
                    )}
                    {item.itemStatus === "VOIDED" && (
                      <p className="text-xs text-danger no-underline">
                        Voided · {item.voidedReason}
                      </p>
                    )}
                    {item.itemStatus === "REFIRED" && (
                      <p className="text-xs font-semibold text-warning">
                        Refired → replacement #
                        {replacementByOriginalId?.get(item.id)?.id.slice(-6) ??
                          "pending"}
                        {item.refireReason ? ` · ${item.refireReason}` : ""}
                        {item.compedAt ? " · original comped" : ""}
                      </p>
                    )}
                    {item.refiresOrderItemId && (
                      <p
                        className={`text-xs font-semibold ${item.refireType === "REFILL" ? "text-success" : "text-warning"}`}
                      >
                        {item.refireType === "REFILL"
                          ? "REFILL · INCLUDED"
                          : "REFIRE"}{" "}
                        replacement of #{item.refiresOrderItemId.slice(-6)}
                      </p>
                    )}
                    {item.itemStatus === "COMPED" && (
                      <p className="text-xs text-success">
                        Comped · {item.compedReason}
                      </p>
                    )}
                    {item.itemStatus === "ACTIVE" &&
                      (onAdjust || onRefire || onRefill || onSeatShares) &&
                      (canVoid ||
                        canComp ||
                        onRefire ||
                        onRefill ||
                        onSeatShares) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {onRefill &&
                            item.comboSlotOption?.isUnlimitedRefill && (
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() => onRefill(item.id)}
                              >
                                <RotateCcw className="h-3.5 w-3.5" /> Refill
                              </Button>
                            )}
                          {onRefire && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => onRefire(item.id)}
                            >
                              <RotateCcw className="h-3.5 w-3.5" /> Refire
                            </Button>
                          )}
                          {onSeatShares && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                onSeatShares(item.id, item.seatShares ?? [])
                              }
                            >
                              Split item
                            </Button>
                          )}
                          {canVoid && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => onAdjust?.(item.id, "void")}
                            >
                              Void
                            </Button>
                          )}
                          {canComp && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => onAdjust?.(item.id, "comp")}
                            >
                              Comp
                            </Button>
                          )}
                        </div>
                      )}
                  </div>
                  <span className="text-sm font-semibold text-text-secondary">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          );
        },
      )}
      {ticket.status === "HELD" && onFireHeld && (
        <div className="px-4 py-3 border-t border-divider">
          <Button
            onClick={() => onFireHeld(ticket.id)}
            disabled={isUpdating}
            className="w-full rounded-2xl"
          >
            Fire Course Now
          </Button>
        </div>
      )}
      {ticket.status === "READY" && onMarkServed && (
        <div className="px-4 py-3 border-t border-divider">
          {}
          <Button
            onClick={() => onMarkServed(ticket.id)}
            disabled={isUpdating}
            variant="success"
            className="w-full rounded-2xl"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark Round Served
          </Button>
        </div>
      )}
    </Card>
  );
};
