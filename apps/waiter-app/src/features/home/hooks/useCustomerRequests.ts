import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCustomersApi, extractApiError } from "@pos/api-client";
import { toast } from "@pos/ui";
import { apiClient } from "@/shared/lib/api-client";
import { useRealtimeEvent } from "@/shared/lib/realtime";
import { getWaiterQueryScope } from "@/shared/lib/query-scope";

export interface WaiterCustomerRequest {
  id: string;
  tableId: string;
  orderId: string | null;
  type: string;
  status: string;
}

export const customerRequestKeys = {
  all: (scope: ReturnType<typeof getWaiterQueryScope>) =>
    ["waiter-customer-requests", ...scope] as const,
};
const customersApi = createCustomersApi(apiClient);

export const useCustomerRequests = () => {
  const queryClient = useQueryClient();
  const scope = getWaiterQueryScope();
  const queryKey = customerRequestKeys.all(scope);
  const query = useQuery({
    queryKey,
    queryFn: (context) =>
      context?.signal
        ? customersApi.listRequests<WaiterCustomerRequest>(context.signal)
        : customersApi.listRequests<WaiterCustomerRequest>(),
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  useRealtimeEvent("customer.request.created", (event) => {
    queryClient.setQueryData<WaiterCustomerRequest[]>(
      queryKey,
      (current = []) =>
        current.some((request) => request.id === event.payload.id)
          ? current
          : [
              {
                id: event.payload.id,
                tableId: event.payload.tableId,
                orderId: event.payload.orderId,
                type: event.payload.type,
                status: event.payload.status,
              },
              ...current,
            ],
    );
  });

  useRealtimeEvent("customer.request.updated", (event) => {
    if (!["RESOLVED", "CANCELLED"].includes(event.payload.status)) return;
    queryClient.setQueryData<WaiterCustomerRequest[]>(
      queryKey,
      (current = []) =>
        current.filter((request) => request.id !== event.payload.id),
    );
  });

  return query;
};

export const useResolveCustomerRequest = () => {
  const queryClient = useQueryClient();
  const queryKey = customerRequestKeys.all(getWaiterQueryScope());

  return useMutation({
    mutationFn: (id: string) => customersApi.resolveRequest(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<WaiterCustomerRequest[]>(
        queryKey,
        (current = []) => current.filter((request) => request.id !== id),
      );
    },
    onError: (error) => {
      toast({
        title: extractApiError(error, "Failed to resolve customer request"),
        tone: "danger",
      });
    },
  });
};
