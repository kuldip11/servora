import { orderRefillService } from "./order-refill.service";
import { orderRefireService } from "./order-refire.service";

export const orderKitchenService = {
  ...orderRefireService,
  ...orderRefillService,
};
