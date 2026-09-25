import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import {
  menuSchedulesService,
  type ScheduleFormInput,
} from "@/features/menu/services/menu-schedules.service";
import { menuKeys } from "@/features/menu/query-keys";

export const useAddSchedule = (itemId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ScheduleFormInput) =>
      menuSchedulesService.add(itemId, input),
    onSuccess: () => {
      notifySuccess("Schedule added");
      queryClient.invalidateQueries({
        queryKey: menuKeys.itemSchedules(itemId),
      });
    },
    onError: (err) => notifyError(err, "Failed to add schedule"),
  });
};
