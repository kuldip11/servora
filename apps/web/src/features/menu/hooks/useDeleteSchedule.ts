import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/query-client";
import { notifyError } from "@/shared/lib/notify";
import { menuSchedulesService } from "@/features/menu/services/menu-schedules.service";
import { menuKeys } from "@/features/menu/query-keys";

export const useDeleteSchedule = (itemId: string) => {
  return useMutation({
    mutationFn: (scheduleId: string) => menuSchedulesService.remove(scheduleId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: menuKeys.itemSchedules(itemId),
      }),
    onError: (error) => notifyError(error, "Failed to remove schedule"),
  });
};
