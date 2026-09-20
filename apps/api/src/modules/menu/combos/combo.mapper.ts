import type { ComboResponse } from "@pos/contracts";

const numeric = (value: string | number | null | undefined): number | null =>
  value == null ? null : Number(value);

export const toComboResponse = (row: any): ComboResponse => ({
  id: row.id,
  tenantId: row.tenantId,
  name: row.name,
  description: row.description ?? null,
  pricePolicy: row.pricePolicy,
  fixedPrice: numeric(row.fixedPrice),
  percentOff: numeric(row.percentOff),
  status: row.status ?? "ACTIVE",
  slots: (row.slots ?? []).map((slot: any) => ({
    id: slot.id,
    name: slot.name,
    minSelections: slot.minSelections,
    maxSelections: slot.maxSelections,
    sortOrder: slot.sortOrder ?? 0,
    options: (slot.options ?? []).map((option: any) => ({
      id: option.id,
      menuItemId: option.menuItemId,
      variantId: option.variantId ?? null,
      upcharge: Number(option.upcharge ?? 0),
      isUnlimitedRefill: Boolean(option.isUnlimitedRefill),
    })),
  })),
});

import type { ComboPreviewResponse } from "@pos/contracts";

const previewLine = (line: any) => ({
  menuItemId: line.menuItemId ?? null,
  menuItemName: line.menuItemName,
  ...(line.variantId ? { variantId: line.variantId } : {}),
  ...(line.variantName ? { variantName: line.variantName } : {}),
  quantity: line.quantity,
  unitPrice: line.unitPrice,
  subtotal: line.subtotal,
  taxRate: line.taxRate,
  ...(line.taxMode ? { taxMode: line.taxMode } : {}),
  ...(line.chefNotes ? { chefNotes: line.chefNotes } : {}),
  ...(line.seatLabel ? { seatLabel: line.seatLabel } : {}),
  ...(line.courseNumber != null ? { courseNumber: line.courseNumber } : {}),
  fulfillmentType: line.fulfillmentType,
  modifiers: (line.modifiers ?? []).map((modifier: any) => ({
    modifierId: modifier.modifierId,
    modifierGroupName: modifier.modifierGroupName,
    name: modifier.name,
    price: modifier.price,
    quantity: modifier.quantity,
    ...(modifier.zoneLabel ? { zoneLabel: modifier.zoneLabel } : {}),
  })),
  pricingAttribution: {
    BASE_PRICE: line.pricingAttribution.BASE_PRICE,
    VARIANT: line.pricingAttribution.VARIANT,
    MODIFIER: line.pricingAttribution.MODIFIER,
    ...(line.pricingAttribution.COMBO != null
      ? { COMBO: line.pricingAttribution.COMBO }
      : {}),
    ...(line.pricingAttribution.PROMOTION != null
      ? { PROMOTION: line.pricingAttribution.PROMOTION }
      : {}),
    ...(line.pricingAttribution.LOYALTY != null
      ? { LOYALTY: line.pricingAttribution.LOYALTY }
      : {}),
    ...(line.pricingAttribution.TAXABLE_BASE != null
      ? { TAXABLE_BASE: line.pricingAttribution.TAXABLE_BASE }
      : {}),
    ...(line.pricingAttribution.CATEGORY_ID
      ? { CATEGORY_ID: line.pricingAttribution.CATEGORY_ID }
      : {}),
  },
});

export const toComboPreviewResponse = (result: any): ComboPreviewResponse => ({
  componentTotal: result.componentTotal,
  upcharges: result.upcharges,
  resolvedTotal: result.resolvedTotal,
  lines: (result.lines ?? []).map(previewLine),
  selections: (result.selections ?? []).map((selection: any) => ({
    slotId: selection.slotId,
    optionIds: selection.optionIds,
  })),
});
