import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@pos/ui";
import { extractApiError } from "@pos/api-client";
import { updateTicketStatus } from "@/features/orders/api/orders";
import { orderKeys } from "@/features/orders/constants";
import { getWaiterQueryScope } from "@/shared/lib/query-scope";

const mutationErrorMessage = (error: unknown, fallback: string): string =>
  extractApiError(error, fallback);

export const useUpdateTicketStatus = () => {
  const qc = useQueryClient();
  const scope = getWaiterQueryScope();

  return useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: string; status: string }) =>
      updateTicketStatus(ticketId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orderKeys.all(scope) });
      toast({ title: "Ticket updated", tone: "success" });
    },
    onError: (err: unknown) =>
      toast({
        title: mutationErrorMessage(err, "Failed to update ticket"),
        tone: "danger",
      }),
  });
};
