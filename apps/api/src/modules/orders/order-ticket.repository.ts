import { orderNewTicketRepository } from "./order-new-ticket.repository";
import { orderRefireRepository } from "./order-refire.repository";

/** Stable facade for kitchen-ticket creation and refire persistence. */
export const orderTicketRepository = {
  ...orderNewTicketRepository,
  ...orderRefireRepository,
};
