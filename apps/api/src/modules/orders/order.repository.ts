import { orderAdjustmentRepository } from "./order-adjustment.repository";
import { orderCommandRepository } from "./order-command.repository";
import { orderCreateRepository } from "./order-create.repository";
import { orderQueryRepository } from "./order-query.repository";
import { orderTicketRepository } from "./order-ticket.repository";

/**
 * Stable repository facade for order services and external module consumers.
 * Implementations are split by transaction responsibility to keep query,
 * creation, adjustment, and kitchen-ticket persistence independently readable.
 */
export const orderRepository = {
  ...orderQueryRepository,
  ...orderCreateRepository,
  ...orderTicketRepository,
  ...orderAdjustmentRepository,
  ...orderCommandRepository,
};
