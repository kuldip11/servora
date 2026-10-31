import { modifierCatalogRepository } from "./modifier-catalog.repository";
import { modifierGroupRepository } from "./modifier-group.repository";
import { modifierOptionRepository } from "./modifier-option.repository";
import { modifierReadRepository } from "./modifier-read.repository";

/** Stable facade for modifier, tag, and allergen persistence. */
export const modifierRepository = {
  ...modifierReadRepository,
  ...modifierGroupRepository,
  ...modifierOptionRepository,
  ...modifierCatalogRepository,
};
