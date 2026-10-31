import { itemLifecycleService } from "./item-lifecycle.service";
import { itemQueryService } from "./item-query.service";
import { itemWriteService } from "./item-write.service";

export type {
  CreateItemInput,
  DuplicateItemInput,
  UpdateItemInput,
} from "./item.types";

export const itemService = {
  ...itemQueryService,
  ...itemWriteService,
  ...itemLifecycleService,
};
