import type { AuthContext } from "@/core/auth";
import { completeOrderFire } from "./order-fire-completion.service";
import { persistFiredTicket } from "./order-fire-persistence.service";
import { prepareOrderFirePricing } from "./order-fire-pricing.service";
import type { FireTicketInput } from "./order-fire.types";
import { validateOrderFire } from "./order-fire-validation.service";

export type { FireTicketInput } from "./order-fire.types";

export const orderFireService = {
  async fireTicket(auth: AuthContext, orderId: string, input: FireTicketInput) {
    const { order, regularItems } = await validateOrderFire(
      auth,
      orderId,
      input,
    );
    const pricing = await prepareOrderFirePricing(
      auth,
      orderId,
      input,
      order,
      regularItems,
    );
    const ticket = await persistFiredTicket(
      auth,
      orderId,
      input,
      order,
      regularItems,
      pricing,
    );
    return completeOrderFire(auth, orderId, order, ticket);
  },
};
