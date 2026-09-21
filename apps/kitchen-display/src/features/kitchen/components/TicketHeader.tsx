import { StatusBadge, type StatusTone } from "@pos/ui";
import type { KitchenTicket } from "@pos/types";
import { Timer } from "./Timer";

interface Props {
  ticket: KitchenTicket;
  statusLabel: string;
  statusTone: StatusTone;
  statusTextClass: string;
}

export const TicketHeader = ({
  ticket,
  statusLabel,
  statusTone,
  statusTextClass,
}: Props) => {
  const order = ticket.order;
  const tableName = order?.table?.name;
  const orderTypeLabel = order?.type?.replace("_", " ").toLowerCase();
  const isTakeaway = order?.type === "TAKEAWAY";
  const tableTakeaway =
    Boolean(tableName) &&
    ticket.items.some(
      (item) => (item.fulfillmentType ?? "DINE_IN") === "TAKEAWAY",
    );

  return (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-text-primary font-bold text-sm">
          {tableName
            ? `Table ${tableName}`
            : isTakeaway
              ? "Takeaway"
              : orderTypeLabel}
          {ticket.course ? (
            <span className="ml-2 text-xs font-semibold text-text-secondary">
              Course {ticket.course.courseNumber}
              {ticket.course.name ? ` · ${ticket.course.name}` : ""}
            </span>
          ) : (
            ticket.ticketNumber > 1 && (
              <span className="ml-2 text-xs font-semibold text-text-secondary">
                Round {ticket.ticketNumber}
              </span>
            )
          )}
        </p>
        <p className="text-xs text-text-secondary mt-0.5">
          {tableName
            ? tableTakeaway
              ? "Takeaway · pack and deliver to table"
              : orderTypeLabel
            : isTakeaway
              ? "Pickup order"
              : null}
        </p>
      </div>
      <div className="text-right">
        <StatusBadge
          label={statusLabel}
          tone={statusTone}
          dot={false}
          className={statusTextClass}
        />
        {ticket.status !== "HELD" && <Timer firedAt={ticket.firedAt} />}
      </div>
    </div>
  );
};
