import { useQueryClient, useMutation } from "@tanstack/react-query";
import { menuKeys } from "@/features/menu/query-keys";
import {
  menuHolidaysService,
  type HolidayFormInput,
} from "@/features/menu/services/menu-holidays.service";
import { notifySuccess } from "@/shared/lib/notify";

export const useAddHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: HolidayFormInput) => menuHolidaysService.add(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.holidays() });
      notifySuccess("Holiday added");
    },
  });
};
