import {
  createBillingApi,
  type BillItemAllocation,
  type SeatSplitResult,
} from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";
import type { Bill } from "@pos/types";

const billingApi = createBillingApi(apiClient);

export interface CollectPaymentInput {
  billId?: string;
  method: string;
  amount: number;
  reference?: string;
}

export const billingService = {
  async collectPayment(
    orderId: string,
    input: CollectPaymentInput,
  ): Promise<void> {
    await billingApi.collectPayment({
      orderId,
      method: input.method,
      amount: input.amount,
      ...(input.billId !== undefined && { billId: input.billId }),
      ...(input.reference !== undefined && { reference: input.reference }),
    });
  },
  getOrderBills(orderId: string, signal?: AbortSignal): Promise<Bill[]> {
    return billingApi.getOrderBills(orderId, signal) as Promise<Bill[]>;
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
