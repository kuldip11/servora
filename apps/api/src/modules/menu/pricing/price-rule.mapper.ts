import type { PriceRuleResponse } from "@pos/contracts";

export const toPriceRuleResponse = (row: any): PriceRuleResponse => ({
  id: row.id,
  tenantId: row.tenantId ?? null,
  organizationId: row.organizationId ?? null,
  menuItemId: row.menuItemId ?? null,
  menuItemSku: row.menuItemSku ?? null,
  variantId: row.variantId ?? null,
  branchId: row.branchId ?? null,
  channel: row.channel ?? null,
  fulfillmentType: row.fulfillmentType ?? null,
  customerGroupId: row.customerGroupId ?? null,
  coverTier: row.coverTier ?? null,
  isPerCover: Boolean(row.isPerCover),
  startDate: row.startDate ?? null,
  endDate: row.endDate ?? null,
  startTime: row.startTime ?? null,
  endTime: row.endTime ?? null,
  price: row.price ?? null,
  percentOff: row.percentOff ?? null,
  taxRate: row.taxRate ?? null,
  priority: row.priority ?? 0,
  isActive: Boolean(row.isActive),
  effectiveFrom:
    row.effectiveFrom instanceof Date
      ? row.effectiveFrom.toISOString()
      : (row.effectiveFrom ?? null),
});
