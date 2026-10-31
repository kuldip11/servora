import { ValidationError } from "@/core/errors";
import type { OrganizationMenuInput } from "./organization-menu.types";

export const normalizeOrganizationMenuInput = (
  input: OrganizationMenuInput,
) => {
  const { effectiveFrom, ...rest } = input;
  const seen = new Set<string>();
  for (const item of input.items) {
    const sku = item.itemSku.trim();
    if (!sku)
      throw new ValidationError("Organization menu item SKU cannot be blank");
    if (seen.has(sku))
      throw new ValidationError(`Duplicate organization menu SKU: ${sku}`);
    seen.add(sku);
  }
  return {
    ...rest,
    name: input.name.trim(),
    ...(effectiveFrom !== undefined
      ? { effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null }
      : {}),
    items: input.items.map((item) => ({
      ...item,
      itemSku: item.itemSku.trim(),
    })),
  };
};
