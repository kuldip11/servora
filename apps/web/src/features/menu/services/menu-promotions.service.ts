import { createMenuApi } from "@pos/api-client";
import type { Promotion, PromotionStats } from "@pos/types";
import { apiClient } from "@/shared/lib/api-client";

const menuApi = createMenuApi(apiClient);

export const menuPromotionsService = {
  list: () => menuApi.listPromotionsFor<Promotion>(),
  stats: (id: string) => menuApi.promotionStats<PromotionStats>(id),
  create: (input: Record<string, unknown>) =>
    menuApi.createPromotion<Promotion>(input),
  update: (id: string, input: Record<string, unknown>) =>
    menuApi.updatePromotion<Promotion>(id, input),
  remove: (id: string) => menuApi.removePromotion(id),
};
