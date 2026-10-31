import { Bell, Receipt } from "lucide-react";
import type {
  OrderDto as Order,
  OrderKitchenTicketDto as KitchenTicket,
} from "@pos/api-client";

interface Props {
  order: Order;
  readyTickets: KitchenTicket[];
}

export const OrderBanners = ({ order, readyTickets }: Props) => {
  return (
    <>
      {readyTickets.length > 0 && (
        <div className="mx-4 mt-4 bg-success-surface border border-success/20 rounded-2xl p-4 flex items-center gap-3">
          <Bell className="w-5 h-5 text-success animate-bounce flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-success">
              {readyTickets.length === 1
                ? "A round is ready for pickup!"
                : `${readyTickets.length} rounds are ready for pickup!`}
            </p>
            <p className="text-xs text-success">
              Collect from kitchen and serve the customer.
            </p>
          </div>
        </div>
      )}

      {order.status === "BILL_REQUESTED" && (
        <div className="mx-4 mt-4 bg-warning-surface border border-warning/20 rounded-2xl p-4 flex items-center gap-3">
          <Receipt className="w-5 h-5 text-warning flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-warning">Bill requested</p>
            <p className="text-xs text-warning">
              Waiting for the cashier to collect payment.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
