import { ValidationError } from "@/core/errors";
import { orderRepository } from "@/modules/orders/order.repository";
import { customerSessionService } from "./customer-session.service";

export const customerPaymentQueryService = {
  async getOrder(token: string, orderId: string) {
    const session = await customerSessionService.getSession(token);
    const order = await orderRepository.findById(session.tenantId, orderId);
    if (
      !order ||
      order.id !== orderId ||
      order.branchId !== session.branchId ||
      order.customerSessionId !== session.id
    ) {
      throw new ValidationError(
        "Order does not belong to this customer session",
      );
    }
    return order;
  },
};
