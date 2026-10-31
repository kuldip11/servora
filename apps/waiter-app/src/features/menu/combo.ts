import type { MenuItemStatusDto } from "@pos/api-client";

export interface WaiterComboOption {
  id: string;
  menuItemId: string;
  variantId: string | null;
  upcharge: number;
  isUnlimitedRefill?: boolean;
}

export interface WaiterComboSlot {
  id: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  sortOrder: number;
  options: WaiterComboOption[];
}

export interface WaiterCombo {
  id: string;
  name: string;
  description: string | null;
  pricePolicy: "FIXED" | "PERCENT_OFF_SUM";
  fixedPrice: number | null;
  percentOff: number | null;
  status: MenuItemStatusDto;
  slots: WaiterComboSlot[];
}

export interface WaiterComboMenuItem {
  id: string;
  name: string;
  basePrice: string | number;
  variants?: Array<{
    id: string;
    name: string;
    price: string | number;
  }>;
}

export interface WaiterComboSelection {
  slotId: string;
  optionIds: string[];
}

export interface WaiterComboCartLine {
  combo: WaiterCombo;
  quantity: number;
  selections: WaiterComboSelection[];
  courseNumber?: number;
}

export const comboLineKey = (line: WaiterComboCartLine) => {
  return `${line.combo.id}__course${line.courseNumber ?? "none"}__${line.selections
    .map(
      (selection) =>
        `${selection.slotId}:${[...selection.optionIds].sort().join(",")}`,
    )
    .sort()
    .join("|")}`;
};

export const estimateComboSubtotal = (
  line: WaiterComboCartLine,
  menuById: Map<string, WaiterComboMenuItem>,
) => {
  let componentSum = 0;
  let upcharges = 0;
  for (const slot of line.combo.slots) {
    const selected =
      line.selections.find((value) => value.slotId === slot.id)?.optionIds ??
      [];
    for (const optionId of selected) {
      const option = slot.options.find((value) => value.id === optionId);
      if (!option) continue;
      const item = menuById.get(option.menuItemId);
      if (!item) continue;
      const variant = option.variantId
        ? item.variants?.find((value) => value.id === option.variantId)
        : undefined;
      componentSum += Number(variant?.price ?? item.basePrice ?? 0);
      upcharges += Number(option.upcharge ?? 0);
    }
  }

  const policyPrice =
    line.combo.pricePolicy === "FIXED"
      ? Number(line.combo.fixedPrice ?? 0)
      : componentSum * (1 - Number(line.combo.percentOff ?? 0) / 100);
  return (Math.round((policyPrice + upcharges) * 100) / 100) * line.quantity;
};
