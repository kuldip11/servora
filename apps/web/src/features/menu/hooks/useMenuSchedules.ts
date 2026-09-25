import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { notifyError } from "@/shared/lib/notify";
import { menuKeys } from "@/features/menu/query-keys";
import { menuSchedulesQuery } from "@/features/menu/query-options";
import { menuSchedulesService } from "@/features/menu/services/menu-schedules.service";

export const useMenuSchedules = (menuId: string) =>
  useQuery(menuSchedulesQuery(menuId));

export const useCreateMenuSchedule = (menuId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      menuSchedulesService.createMenuSchedule(menuId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: menuKeys.menuSchedules(menuId),
      }),
    onError: (error) => notifyError(error, "Failed to add menu schedule"),
  });
};

export const useRemoveMenuSchedule = (menuId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menuSchedulesService.removeMenuSchedule,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: menuKeys.menuSchedules(menuId),
      }),
    onError: (error) => notifyError(error, "Failed to remove menu schedule"),
  });
};
