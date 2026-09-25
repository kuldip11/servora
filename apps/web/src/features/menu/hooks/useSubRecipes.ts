import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { menuSubRecipesService } from "@/features/menu/services/menu-sub-recipes.service";
import { menuKeys } from "@/features/menu/query-keys";
import { notifyError, notifySuccess } from "@/shared/lib/notify";

export const useSubRecipes = () =>
  useQuery({
    queryKey: menuKeys.subRecipes(),
    queryFn: menuSubRecipesService.list,
  });

export const useCreateSubRecipe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menuSubRecipesService.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: menuKeys.subRecipes() });
      notifySuccess("Sub-recipe created");
    },
  });
};

export const useDeleteSubRecipe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menuSubRecipesService.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: menuKeys.subRecipes() });
      notifySuccess("Sub-recipe deleted");
    },
    onError: (error) => notifyError(error, "Could not delete sub-recipe"),
  });
};
