import { inventoryDeductionRepository } from "./inventory-deduction.repository";
import { inventoryRecipeRepository } from "./inventory-recipe.repository";
import { inventoryStockRepository } from "./inventory-stock.repository";

export type { StockUpdateResult } from "./inventory-stock.repository";

export const inventoryRepository = {
  ...inventoryStockRepository,
  ...inventoryRecipeRepository,
  ...inventoryDeductionRepository,
};
