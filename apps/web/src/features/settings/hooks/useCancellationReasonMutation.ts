import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  cancellationReasonKeys,
  cancellationReasonsService,
} from "@/features/orders/public/cancellation-reasons";

export type CancellationReasonAction =
  | { type: "create"; label: string }
  | { type: "toggle"; id: string; isActive: boolean };

export const useCancellationReasonMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: CancellationReasonAction) =>
      action.type === "create"
        ? cancellationReasonsService.create(action.label)
        : cancellationReasonsService.update(action.id, {
            isActive: action.isActive,
          }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: cancellationReasonKeys.all(),
        }),
        queryClient.invalidateQueries({
          queryKey: cancellationReasonKeys.active(),
        }),
      ]);
    },
  });
};
