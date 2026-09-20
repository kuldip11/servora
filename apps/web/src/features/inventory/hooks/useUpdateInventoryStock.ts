import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/query-client";
import { notifySuccess } from "@/shared/lib/notify";
import {
  inventoryService,
  type StockUpdateInput,
} from "@/features/inventory/services/inventory.service";
import { inventoryKeys } from "@/features/inventory/query-keys";

export const useUpdateInventoryStock = () => {
  return useMutation({
    mutationFn: ({
      itemId,
      input,
    }: {
      itemId: string;
      input: StockUpdateInput;
    }) => inventoryService.updateStock(itemId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.invalidateQueries({
        queryKey: ["inventory", "transactions"],
      });
      notifySuccess("Stock updated");
    },
  });
};
