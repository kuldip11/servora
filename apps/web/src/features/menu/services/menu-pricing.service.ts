import { createMenuApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const menuApi = createMenuApi(apiClient);

export const menuPricingService = {
  list: (params: Record<string, string | undefined> = {}) =>
    menuApi.listPriceRulesFor(params),
  create: (input: Record<string, unknown>) => menuApi.createPriceRule(input),
  remove: menuApi.removePriceRule,
  createHappyHour: (input: Record<string, unknown>) =>
    menuApi.createHappyHourRule(input),
};
