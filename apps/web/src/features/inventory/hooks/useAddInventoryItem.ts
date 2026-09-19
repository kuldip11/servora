import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/query-client";
import { notifySuccess } from "@/shared/lib/notify";
import {
  inventoryService,
  type InventoryItemFormInput,
} from "@/features/inventory/services/inventory.service";
import { inventoryKeys } from "@/features/inventory/query-keys";

export const useAddInventoryItem = () => {
  return useMutation({
    mutationFn: (input: InventoryItemFormInput) => inventoryService.add(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      notifySuccess("Item added to inventory");
    },
  });
};
