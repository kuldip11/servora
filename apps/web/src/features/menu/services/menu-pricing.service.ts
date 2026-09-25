import { createMenuApi } from "@pos/api-client";
import type { PriceRule } from "@pos/types";
import { apiClient } from "@/shared/lib/api-client";

const menuApi = createMenuApi(apiClient);

export const menuPricingService = {
  list: (params: Record<string, string | undefined> = {}) =>
    menuApi.listPriceRulesFor<PriceRule>(params),
  create: (input: Record<string, unknown>) =>
    menuApi.createPriceRule<PriceRule>(input),
  remove: menuApi.removePriceRule,
  createHappyHour: (input: Record<string, unknown>) =>
    menuApi.createHappyHourRule<unknown[]>(input),
};
