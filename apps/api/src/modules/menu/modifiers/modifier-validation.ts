import { ValidationError } from "@/core/errors";
import { modifierOptionNotFound } from "./modifier.errors";
import { modifierRepository } from "./modifier.repository";
import type { ModifierOptionInput } from "./modifier.types";

export const assertNoCircularDependency = async (
  tenantId: string,
  groupId: string,
  dependsOnOptionId: string | null | undefined,
) => {
  if (!dependsOnOptionId) return;

  const visitedGroupIds = new Set<string>([groupId]);
  let prerequisiteOptionId: string | null | undefined = dependsOnOptionId;

  while (prerequisiteOptionId) {
    const prerequisite = await modifierRepository.findModifierOption(
      tenantId,
      prerequisiteOptionId,
    );
    if (!prerequisite) throw modifierOptionNotFound(prerequisiteOptionId);

    if (visitedGroupIds.has(prerequisite.modifierGroupId)) {
      throw new ValidationError("Circular modifier group dependency");
    }
    visitedGroupIds.add(prerequisite.modifierGroupId);

    const prerequisiteGroup = await modifierRepository.findModifierGroup(
      tenantId,
      prerequisite.modifierGroupId,
    );
    prerequisiteOptionId = prerequisiteGroup?.dependsOnOptionId ?? null;
  }
};

export const withStringPrice = (
  option: ModifierOptionInput,
): Omit<ModifierOptionInput, "additionalPrice" | "variantPrices"> & {
  additionalPrice: string;
  variantPrices?:
    Array<{ variantId: string; additionalPrice: string }> | undefined;
} => {
  const { additionalPrice, variantPrices, ...rest } = option;
  return {
    ...rest,
    additionalPrice: String(additionalPrice),
    ...(variantPrices !== undefined
      ? {
          variantPrices: variantPrices.map((price) => ({
            ...price,
            additionalPrice: String(price.additionalPrice),
          })),
        }
      : {}),
  };
};
