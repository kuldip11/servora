import { createdResponse, successResponse } from "@/core/response";
import { ValidationError } from "@/core/errors";
import {
  customerService,
  type CreateCustomerOrderInput,
} from "./customer.service";
import type { CustomerCheckoutInput } from "./customer-payment.service";
import {
  toCustomerCheckoutResponse,
  toCustomerMenuResponse,
  toCustomerOrderResponse,
  toCustomerSessionResponse,
  toCustomerTakeawayPaymentResponse,
} from "./customer.mapper";

export const customerController = {
  async createSession(qrToken: string) {
    return createdResponse(
      toCustomerSessionResponse(await customerService.createSession(qrToken)),
    );
  },
  async getMenu(sessionToken: string) {
    return successResponse(
      toCustomerMenuResponse(await customerService.getMenu(sessionToken)),
    );
  },
  async createOrder(
    sessionToken: string,
    input: CreateCustomerOrderInput,
    customerRequestId?: string,
  ) {
    return createdResponse(
      toCustomerOrderResponse(
        await customerService.createOrder(
          sessionToken,
          input,
          customerRequestId,
        ),
      ),
    );
  },
  async verifyTakeawayPayment(
    sessionToken: string,
    orderId: string,
    input: Omit<
      Parameters<typeof customerService.verifyTakeawayPayment>[1],
      "orderId"
    >,
  ) {
    return createdResponse(
      toCustomerOrderResponse(
        await customerService.verifyTakeawayPayment(sessionToken, {
          ...input,
          orderId,
        }),
      ),
    );
  },
  async initiateTakeawayPayment(sessionToken: string, orderId: string) {
    const session = await customerService.getSession(sessionToken);
    if (session.mode !== "TAKEAWAY")
      throw new ValidationError(
        "Online payment is only required for takeaway orders",
      );
    return createdResponse(
      toCustomerTakeawayPaymentResponse(
        await customerService.initiateTakeawayPayment(
          session.tenantId,
          session.branchId,
          orderId,
        ),
      ),
    );
  },
  async checkout(sessionToken: string, input: CustomerCheckoutInput) {
    return createdResponse(
      toCustomerCheckoutResponse(
        await customerService.checkout(sessionToken, input),
      ),
    );
  },
  async getOrder(sessionToken: string, orderId: string) {
    return successResponse(
      toCustomerOrderResponse(
        await customerService.getOrder(sessionToken, orderId),
      ),
    );
  },
};
