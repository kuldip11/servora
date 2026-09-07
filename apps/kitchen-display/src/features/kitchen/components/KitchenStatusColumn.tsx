import { CheckCircle2 } from "lucide-react";
import type { KitchenTicket, KitchenTicketStatus } from "@pos/types";
import { EmptyState, Spinner } from "@pos/ui";
import { TicketCard } from "./TicketCard";

interface KitchenStatusColumnProps {
  title: string;
  colorClassName: string;
  status: KitchenTicketStatus;
  tickets: KitchenTicket[];
  isLoading: boolean;
  isTicketUpdating: (ticketId: string) => boolean;
  onUpdateStatus: (ticketId: string, status: KitchenTicketStatus) => void;
}

export const KitchenStatusColumn = ({
  title,
  colorClassName,
  status,
  tickets,
  isLoading,
  isTicketUpdating,
  onUpdateStatus,
}: KitchenStatusColumnProps) => (
  <section
    aria-label={`${title} tickets`}
    className="flex flex-col overflow-hidden bg-background"
  >
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <h2 className={`text-sm font-semibold ${colorClassName}`}>{title}</h2>
      <span
        className={`rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-bold ${colorClassName}`}
      >
        {tickets.length}
      </span>
    </div>
    <div className="flex-1 space-y-3 overflow-y-auto p-3">
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No tickets" size="sm" />
      ) : (
        tickets.map((ticket) => (
          <div
            key={ticket.id}
            style={{
              contentVisibility: "auto",
              containIntrinsicSize: "320px",
            }}
          >
            <TicketCard
              ticket={ticket}
              onUpdateStatus={onUpdateStatus}
              isUpdating={isTicketUpdating(ticket.id)}
            />
          </div>
        ))
      )}
    </div>
    <span className="sr-only">Status: {status}</span>
  </section>
);
