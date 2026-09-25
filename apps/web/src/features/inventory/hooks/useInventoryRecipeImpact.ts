import { useQuery } from "@tanstack/react-query";
import { inventoryKeys } from "@/features/inventory/query-keys";
import { inventoryService } from "@/features/inventory/services/inventory.service";

export const useInventoryRecipeImpact = (
  inventoryItemId: string | undefined,
) => {
  return useQuery({
    queryKey: inventoryKeys.impact(inventoryItemId ?? "none"),
    queryFn: ({ signal }) =>
      inventoryService.recipeImpact(inventoryItemId!, signal),
    enabled: Boolean(inventoryItemId),
  });
};
