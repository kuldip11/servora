import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifySuccess } from "@/shared/lib/notify";
import type { RecipeIngredientInput } from "@pos/types";
import { menuRecipesService } from "@/features/menu/services/menu-recipes.service";
import { menuKeys } from "@/features/menu/query-keys";
import { inventoryKeys } from "@/features/inventory/query-keys";

export const useSaveRecipe = (itemId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ingredients: RecipeIngredientInput[]) =>
      menuRecipesService.save(itemId, ingredients),
    onSuccess: () => {
      notifySuccess("Recipe saved");
      queryClient.invalidateQueries({ queryKey: menuKeys.itemRecipe(itemId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
    },
  });
};
