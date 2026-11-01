import { itemAssociationRepository } from "./item-association.repository";
import { itemDuplicateRepository } from "./item-duplicate.repository";
import { itemReadRepository } from "./item-read.repository";
import { itemVariantRepository } from "./item-variant.repository";
import { itemWriteRepository } from "./item-write.repository";

export { ITEM_DETAIL_RELATIONS } from "./item-read-model";

export const itemRepository = {
  ...itemReadRepository,
  ...itemWriteRepository,
  ...itemVariantRepository,
  ...itemDuplicateRepository,
  ...itemAssociationRepository,
};
