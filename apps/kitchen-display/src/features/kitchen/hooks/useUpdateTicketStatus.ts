import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@pos/ui";
import type { KitchenTicketStatus } from "@pos/types";
import { extractApiError } from "@pos/api-client";
import { updateTicketStatus } from "@/features/kitchen/api/tickets";
import { kitchenKeys } from "@/features/kitchen/query/kitchen.keys";
import { getKitchenQueryScope } from "@/shared/lib/query-scope";

export const useUpdateTicketStatus = () => {
  const qc = useQueryClient();
  const scope = getKitchenQueryScope();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: KitchenTicketStatus }) =>
      updateTicketStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kitchenKeys.tickets(scope) });
      toast({ title: "Ticket updated", tone: "success" });
    },
    onError: (error) =>
      toast({
        title: extractApiError(error, "Failed to update ticket"),
        tone: "danger",
      }),
  });
};
