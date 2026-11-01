import { completeCustomerOrder } from "./customer-order-completion";
import { persistCustomerOrder } from "./customer-order-persistence";
import { prepareCustomerOrder } from "./customer-order-preparation";

export type { CreateCustomerOrderInput } from "./customer-order.types";

export const customerOrderService = {
  async createOrder(
    token: string,
    input: import("./customer-order.types").CreateCustomerOrderInput,
    customerRequestId?: string,
  ) {
    const prepared = await prepareCustomerOrder(token, input);
    const persisted = await persistCustomerOrder(
      prepared,
      input,
      customerRequestId,
    );
    return completeCustomerOrder(persisted);
  },
};
