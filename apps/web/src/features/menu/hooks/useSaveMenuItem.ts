import { useQueryClient, useMutation } from "@tanstack/react-query";
import { extractApiFieldErrors } from "@pos/api-client";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import {
  menuItemsService,
  type MenuItemFormPayload,
} from "@/features/menu/services/menu-items.service";
import { menuKeys } from "@/features/menu/query-keys";
import type { MenuItem } from "@pos/types";

export const useSaveMenuItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      item,
      payload,
    }: {
      item: MenuItem | null;
      payload: MenuItemFormPayload;
    }) => menuItemsService.saveItem(item, payload),
    onSuccess: (_data, { item }) => {
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      notifySuccess(item ? "Item updated" : "Item added");
    },
    onError: (err) => {
      if (!Object.keys(extractApiFieldErrors(err)).length)
        notifyError(err, "Failed to save item");
    },
  });
};
