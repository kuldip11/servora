import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@pos/ui";
import type { KitchenTicketStatus } from "@pos/types";
import { extractApiError } from "@pos/api-client";
import { updateTicketStatus } from "@/features/kitchen/api/tickets";
import { KITCHEN_TICKETS_QUERY_KEY } from "./useKitchenTickets";

export const useUpdateTicketStatus = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: KitchenTicketStatus }) =>
      updateTicketStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KITCHEN_TICKETS_QUERY_KEY });
      toast({ title: "Ticket updated", tone: "success" });
    },
    onError: (error) =>
      toast({
        title: extractApiError(error, "Failed to update ticket"),
        tone: "danger",
      }),
  });
};
