import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/query-client";
import { notifyError } from "@/shared/lib/notify";
import { menuItemsService } from "@/features/menu/services/menu-items.service";
import { menuKeys } from "@/features/menu/query-keys";

export const useToggleItemAvailability = () => {
  return useMutation({
    mutationFn: ({
      id,
      isAvailable,
      reason,
    }: {
      id: string;
      isAvailable: boolean;
      reason?: string;
    }) =>
      isAvailable
        ? menuItemsService.clearManualAvailabilityOverride(id)
        : menuItemsService.setManualAvailabilityOverride(
            id,
            "OUT_OF_STOCK",
            reason ?? "Manual availability override",
          ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() }),
    onError: (error) => notifyError(error, "Failed to update availability"),
  });
};
