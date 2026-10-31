import { memo } from "react";
import { Card } from "@pos/ui";
import type {
  KitchenTicketDto as KitchenTicket,
  KitchenTicketUpdateStatus,
} from "@pos/api-client";
import { STATUS_CONFIG } from "@/features/kitchen/constants";
import { isUrgent, voidUrgency } from "@/features/kitchen/utils/ticket";
import { TicketHeader } from "./TicketHeader";
import { TicketItems } from "./TicketItems";
import { TicketFooter } from "./TicketFooter";

interface Props {
  ticket: KitchenTicket;
  onUpdateStatus: (id: string, status: KitchenTicketUpdateStatus) => void;
  isUpdating: boolean;
}

export const TicketCard = memo(function TicketCard({
  ticket,
  onUpdateStatus,
  isUpdating,
}: Props) {
  const cfg = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG];
  if (!cfg) return null;

  const urgent = isUrgent(ticket.firedAt);
  const voidLevel = voidUrgency(ticket);

  return (
    <Card
      padding="md"
      className={`border-2 rounded-xl flex flex-col gap-3 ${cfg.border} ${urgent ? "ring-2 ring-danger/60" : ""}`}
    >
      {voidLevel !== "none" && (
        <div
          className={`rounded-md px-2 py-1.5 text-xs font-bold ${voidLevel === "danger" ? "bg-danger-surface text-danger" : "bg-warning-surface text-warning"}`}
        >
          {voidLevel === "danger"
            ? "URGENT VOID — stop preparation"
            : "VOIDED before prep"}
        </div>
      )}
      <TicketHeader
        ticket={ticket}
        statusLabel={cfg.label}
        statusTone={cfg.badgeTone}
        statusTextClass={cfg.badgeTextClass}
      />
      <TicketItems notes={ticket.notes} items={ticket.items} />
      <TicketFooter
        next={cfg.next}
        nextLabel={cfg.nextLabel}
        btnClass={cfg.btn}
        isUpdating={isUpdating}
        onAdvance={() => cfg.next && onUpdateStatus(ticket.id, cfg.next)}
      />
    </Card>
  );
});
