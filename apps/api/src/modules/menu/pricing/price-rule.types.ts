import type { NewPriceRule } from "./price-rule.repository";

export type PriceRuleInput = Omit<
  NewPriceRule,
  | "id"
  | "tenantId"
  | "createdAt"
  | "updatedAt"
  | "price"
  | "percentOff"
  | "taxRate"
  | "effectiveFrom"
> & {
  price?: number | null;
  percentOff?: number | null;
  taxRate?: number | null;
  effectiveFrom?: string | null;
};

export interface HappyHourInput {
  categoryId?: string;
  menuId?: string;
  percentOff: number;
  startTime: string;
  endTime: string;
  startDate?: string;
  endDate?: string;
  branchId?: string;
  channel?: PriceRuleInput["channel"];
  fulfillmentType?: PriceRuleInput["fulfillmentType"];
  priority?: number;
}
