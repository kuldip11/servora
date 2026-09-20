import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/query-client";
import { notifySuccess } from "@/shared/lib/notify";
import { menuItemsService } from "@/features/menu/services/menu-items.service";
import { menuKeys } from "@/features/menu/query-keys";

export const useAddCategory = () => {
  return useMutation({
    mutationFn: (name: string) => menuItemsService.addCategory(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      notifySuccess("Category added");
    },
  });
};
