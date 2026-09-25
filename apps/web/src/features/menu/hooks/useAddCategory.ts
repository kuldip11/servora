import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifySuccess } from "@/shared/lib/notify";
import { menuItemsService } from "@/features/menu/services/menu-items.service";
import { menuKeys } from "@/features/menu/query-keys";

export const useAddCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => menuItemsService.addCategory(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      notifySuccess("Category added");
    },
  });
};
