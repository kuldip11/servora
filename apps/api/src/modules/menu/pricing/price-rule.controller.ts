import type { AuthContext } from "@/core/auth";
import { createdResponse, successResponse } from "@/core/response";
import { toPriceRuleResponse } from "./price-rule.mapper";
import {
  priceRuleService,
  type HappyHourInput,
  type PriceRuleInput,
} from "./price-rule.service";

export const priceRuleController = {
  async list(
    auth: AuthContext,
    menuItemId?: string,
    organizationId?: string,
    menuItemSku?: string,
  ) {
    return successResponse(
      (
        await priceRuleService.list(
          auth,
          menuItemId,
          organizationId,
          menuItemSku,
        )
      ).map(toPriceRuleResponse),
    );
  },
  async create(auth: AuthContext, input: PriceRuleInput) {
    return createdResponse(
      toPriceRuleResponse(await priceRuleService.create(auth, input)),
    );
  },
  async createHappyHour(auth: AuthContext, input: HappyHourInput) {
    return createdResponse(
      (await priceRuleService.createHappyHour(auth, input)).map(
        toPriceRuleResponse,
      ),
    );
  },
  async update(auth: AuthContext, id: string, input: Partial<PriceRuleInput>) {
    return successResponse(
      toPriceRuleResponse(await priceRuleService.update(auth, id, input)),
    );
  },
  async remove(auth: AuthContext, id: string) {
    await priceRuleService.remove(auth, id);
    return successResponse(null);
  },
};
