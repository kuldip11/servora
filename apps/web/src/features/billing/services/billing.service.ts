import {
  createBillingApi,
  type BillDto,
  type BillItemAllocation,
  type DomainCollectPaymentInput,
  type SeatSplitResult,
} from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const billingApi = createBillingApi(apiClient);

export type CollectPaymentInput = Omit<DomainCollectPaymentInput, "orderId">;

export const billingService = {
  async collectPayment(
    orderId: string,
    input: CollectPaymentInput,
  ): Promise<void> {
    await billingApi.collectPayment({
      orderId,
      ...(input.idempotencyKey !== undefined && {
        idempotencyKey: input.idempotencyKey,
      }),
      method: input.method,
      amount: input.amount,
      ...(input.billId !== undefined && { billId: input.billId }),
      ...(input.reference !== undefined && { reference: input.reference }),
    });
  },
  getOrderBills(orderId: string, signal?: AbortSignal): Promise<BillDto[]> {
    return billingApi.getOrderBills(orderId, signal);
  },
  splitOrder: billingApi.splitOrder,
  splitOrderByItems(orderId: string, allocations: BillItemAllocation[]) {
    return billingApi.splitOrderByItems(orderId, allocations);
  },
  splitOrderBySeat(
    orderId: string,
    sharedItemStrategy: "EVEN_SPLIT" | "MANUAL",
  ): Promise<SeatSplitResult> {
    return billingApi.splitOrderBySeat(orderId, sharedItemStrategy);
  },
};
