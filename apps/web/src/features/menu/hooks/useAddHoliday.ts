import { useMutation } from "@tanstack/react-query";
import { menuKeys } from "@/features/menu/query-keys";
import {
  menuHolidaysService,
  type HolidayFormInput,
} from "@/features/menu/services/menu-holidays.service";
import { notifySuccess } from "@/shared/lib/notify";
import { queryClient } from "@/shared/lib/query-client";

export const useAddHoliday = () =>
  useMutation({
    mutationFn: (input: HolidayFormInput) => menuHolidaysService.add(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.holidays() });
      notifySuccess("Holiday added");
    },
  });
