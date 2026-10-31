import { promotionLifecycleService } from "./promotion-lifecycle.service";
import { promotionPreviewService } from "./promotion-preview.service";

export type { PromotionInput, PromotionPreviewInput } from "./promotion.types";

export const promotionService = {
  ...promotionPreviewService,
  ...promotionLifecycleService,
};
