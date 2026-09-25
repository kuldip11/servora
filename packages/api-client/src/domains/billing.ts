import { voidDomainRequest } from "./shared";
import { getDomainData, postDomainData, type DomainHttpClient } from "./shared";

export interface CollectPaymentInput {
  orderId: string;
  billId?: string;
  method: string;
  amount: number;
  reference?: string;
}

export interface BillItemAllocation {
  label: string;
  orderItemIds: string[];
}

export type SeatSplitResult =
  | { status: "CREATED"; bills: unknown[] }
  | {
      status: "MANUAL_REQUIRED";
      allocations: BillItemAllocation[];
      sharedItemIds: string[];
    };

export const createBillingApi = (client: DomainHttpClient) => {
  return {
    collectPayment(input: CollectPaymentInput): Promise<void> {
      return voidDomainRequest(client.post("/payments", input));
    },
    getOrderBills<T = unknown[]>(
      orderId: string,
      signal?: AbortSignal,
    ): Promise<T> {
      return getDomainData<T>(
        client,
        `/orders/${orderId}/bills`,
        signal ? { signal } : undefined,
      );
    },
    splitOrder<T = unknown>(orderId: string, ways: number): Promise<T> {
      return postDomainData<T>(client, `/orders/${orderId}/bills/split`, {
        ways,
      });
    },
    splitOrderByItems<T = unknown>(
      orderId: string,
      allocations: BillItemAllocation[],
    ): Promise<T> {
      return postDomainData<T>(client, `/orders/${orderId}/bills/split-items`, {
        allocations,
      });
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
