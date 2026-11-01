import { modifierCatalogService } from "./modifier-catalog.service";
import { modifierGroupService } from "./modifier-group.service";

export type {
  CreateModifierGroupInput,
  CreateTagInput,
  ModifierOptionInput,
  UpdateModifierGroupInput,
} from "./modifier.types";

export const modifierService = {
  ...modifierGroupService,
  ...modifierCatalogService,
};
