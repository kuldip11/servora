import { useMutation } from "@tanstack/react-query";
import { menuKeys } from "@/features/menu/query-keys";
import { menuHolidaysService } from "@/features/menu/services/menu-holidays.service";
import { notifyError } from "@/shared/lib/notify";
import { queryClient } from "@/shared/lib/query-client";

export const useDeleteHoliday = () =>
  useMutation({
    mutationFn: (id: string) => menuHolidaysService.remove(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.holidays() }),
    onError: (error) => notifyError(error, "Failed to delete holiday"),
  });
