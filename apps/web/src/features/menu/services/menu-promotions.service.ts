import { createMenuApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const menuApi = createMenuApi(apiClient);

export const menuPromotionsService = {
  list: () => menuApi.listPromotionsFor(),
  stats: (id: string) => menuApi.promotionStats(id),
  create: (input: Record<string, unknown>) => menuApi.createPromotion(input),
  update: (id: string, input: Record<string, unknown>) =>
    menuApi.updatePromotion(id, input),
  remove: (id: string) => menuApi.removePromotion(id),
};
