import { createMenuApi, type MenuRecipeDto } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const menuApi = createMenuApi(apiClient);
import type { RecipeIngredientInput } from "@pos/types";

export const menuRecipesService = {
  async get(itemId: string): Promise<MenuRecipeDto[]> {
    return menuApi.getItemRecipes(itemId);
  },

  async save(
    itemId: string,
    ingredients: RecipeIngredientInput[],
  ): Promise<void> {
    await menuApi.saveItemRecipes(itemId, ingredients);
  },
};
