import { createCustomersApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";
import type { LoyaltyCustomer } from "@pos/types";

const customersApi = createCustomersApi(apiClient);

export const searchCustomers = async (
  query: string,
  signal?: AbortSignal,
): Promise<LoyaltyCustomer[]> => {
  const customers = await customersApi.search(signal);
  const needle = query.trim().toLowerCase();
  return customers
    .filter((customer) =>
      [customer.name, customer.phone, customer.email].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(needle),
      ),
    )
    .slice(0, 20);
};
