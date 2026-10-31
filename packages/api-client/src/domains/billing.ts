import type {
  BillItemAllocationRequest,
  BillResponse,
  CreatePaymentRequest,
  PaymentCollectionResultResponse,
  SeatSplitResultResponse,
} from "@pos/contracts";
import { getDomainData, postDomainData, type DomainHttpClient } from "./shared";

export type CollectPaymentInput = CreatePaymentRequest;
export type BillItemAllocation = BillItemAllocationRequest;
export type BillDto = BillResponse;
export type PaymentCollectionResultDto = PaymentCollectionResultResponse;
export type SeatSplitResult = SeatSplitResultResponse;

export const createBillingApi = (client: DomainHttpClient) => {
  return {
    collectPayment(
      input: CollectPaymentInput,
    ): Promise<PaymentCollectionResultDto> {
      return postDomainData<PaymentCollectionResultDto>(
        client,
        "/payments",
        input,
      );
    },
    getOrderBills(orderId: string, signal?: AbortSignal): Promise<BillDto[]> {
      return getDomainData<BillDto[]>(
        client,
        `/orders/${orderId}/bills`,
        signal ? { signal } : undefined,
      );
    },
    splitOrder(orderId: string, ways: number): Promise<BillDto[]> {
      return postDomainData<BillDto[]>(
        client,
        `/orders/${orderId}/bills/split`,
        {
          ways,
        },
      );
    },
    splitOrderByItems(
      orderId: string,
      allocations: BillItemAllocation[],
    ): Promise<BillDto[]> {
      return postDomainData<BillDto[]>(
        client,
        `/orders/${orderId}/bills/split-items`,
        {
          allocations,
        },
      );
    },
    splitOrderBySeat(
      orderId: string,
      sharedItemStrategy: "EVEN_SPLIT" | "MANUAL",
    ): Promise<SeatSplitResult> {
      return postDomainData<SeatSplitResult>(
        client,
        `/orders/${orderId}/bills/split-seat`,
        { sharedItemStrategy },
      );
    },
  };
};
