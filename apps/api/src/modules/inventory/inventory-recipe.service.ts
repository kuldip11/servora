import { inventoryRecipeAvailabilityService } from "./inventory-recipe-availability.service";
import { inventoryRecipeCostService } from "./inventory-recipe-cost.service";
import { inventoryRecipeDeductionService } from "./inventory-recipe-deduction.service";
import { inventoryRecipeImpactService } from "./inventory-recipe-impact.service";

export const inventoryRecipeService = {
  ...inventoryRecipeImpactService,
  ...inventoryRecipeCostService,
  ...inventoryRecipeDeductionService,
  ...inventoryRecipeAvailabilityService,
};
