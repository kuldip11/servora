import type { AuthContext } from "@/core/auth";
import { successResponse } from "@/core/response";
import type { RecipeIngredientInput } from "@pos/types";
import { recipesService } from "./recipes.service";
import { toRecipeResponse } from "./recipes.mapper";

export const recipesController = {
  async getItemRecipe(auth: AuthContext, itemId: string) {
    const recipe = await recipesService.getItemRecipe(auth, itemId);
    return successResponse(recipe.map(toRecipeResponse));
  },

  async setItemRecipe(
    auth: AuthContext,
    itemId: string,
    ingredients: RecipeIngredientInput[],
  ) {
    const recipe = await recipesService.setItemRecipe(
      auth,
      itemId,
      ingredients,
    );
    return successResponse(recipe.map(toRecipeResponse));
  },
};
