import { priceRuleHappyHourService } from "./price-rule-happy-hour.service";
import { priceRuleLifecycleService } from "./price-rule-lifecycle.service";

export type { HappyHourInput, PriceRuleInput } from "./price-rule.types";

export const priceRuleService = {
  ...priceRuleLifecycleService,
  ...priceRuleHappyHourService,
};
