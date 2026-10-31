import type { CustomerCombo, CustomerMenuItem } from "@/features/menu";

export type CustomerComboSelection = {
  slotId: string;
  optionIds: string[];
};

export type ComboCartLine = {
  combo: CustomerCombo;
  quantity: number;
  selections: CustomerComboSelection[];
};

const cents = (value: number) => {
  return Math.round(value * 100);
};

export const estimateComboLine = (
  line: ComboCartLine,
  menuById: Map<string, CustomerMenuItem>,
) => {
  const components: Array<{
    price: number;
    taxRate: number;
    upcharge: number;
  }> = [];
  for (const slot of line.combo.slots) {
    const chosen =
      line.selections.find((value) => value.slotId === slot.id)?.optionIds ??
      [];
    for (const optionId of chosen) {
      const option = slot.options.find((value) => value.id === optionId);
      if (!option) continue;
      const item = menuById.get(option.menuItemId);
      if (!item) continue;
      const variant = option.variantId
        ? item.variants.find((value) => value.id === option.variantId)
        : undefined;
      components.push({
        price: Number(variant?.price ?? item.basePrice),
        taxRate: Number(item.taxRate),
        upcharge: Number(option.upcharge),
      });
    }
  }

  const componentSum = components.reduce(
    (sum, component) => sum + component.price,
    0,
  );
  const upcharges = components.reduce(
    (sum, component) => sum + component.upcharge,
    0,
  );
  const policyPrice =
    line.combo.pricePolicy === "FIXED"
      ? Number(line.combo.fixedPrice ?? 0)
      : componentSum * (1 - Number(line.combo.percentOff ?? 0) / 100);
  const unitSubtotal = Math.round((policyPrice + upcharges) * 100) / 100;

  const target = cents(unitSubtotal);
  const weights = components.map((component) =>
    Math.max(0, cents(component.price)),
  );
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  const raw = weights.map((weight) =>
    weightSum
      ? (target * weight) / weightSum
      : target / Math.max(1, components.length),
  );
  const allocations = raw.map(Math.floor);
  let remainder = target - allocations.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let i = 0; i < remainder && order.length; i++)
    allocations[order[i % order.length]!.index]!++;

  const unitTax = components.reduce(
    (sum, component, index) =>
      sum + (((allocations[index] ?? 0) / 100) * component.taxRate) / 100,
    0,
  );
  return {
    subtotal: unitSubtotal * line.quantity,
    tax: unitTax * line.quantity,
    total: (unitSubtotal + unitTax) * line.quantity,
  };
};

export const comboLineKey = (line: ComboCartLine) => {
  const selections = line.selections
    .map(
      (selection) =>
        `${selection.slotId}:${[...selection.optionIds].sort().join(",")}`,
    )
    .sort()
    .join("|");
  return `${line.combo.id}__${selections}`;
};
