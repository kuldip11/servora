import { useQuery } from "@tanstack/react-query";
import { searchCustomers } from "@/features/menu/api/customers";
import { menuKeys } from "@/features/menu/query/menu.keys";
import { getWaiterQueryScope } from "@/shared/lib/query-scope";

export const useCustomerSearch = (query: string) => {
  const scope = getWaiterQueryScope();
  return useQuery({
    queryKey: menuKeys.customerSearch(scope, query),
    queryFn: (context) =>
      context?.signal
        ? searchCustomers(query, context.signal)
        : searchCustomers(query),
    enabled: query.length >= 2,
  });
};
