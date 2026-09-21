import type { CartItem, SelectedModifier } from "@/features/menu/types";
import type {
  OrderableMenuItem,
  OrderableModifierGroup,
  OrderableModifierOption,
} from "@pos/types";

type ZoneLabel = "LEFT" | "RIGHT" | "WHOLE";

export const getModifierGroups = (
  item: OrderableMenuItem,
): OrderableModifierGroup[] =>
  (item.modifierGroupLinks ?? []).map((link) => link.group);

export const getModifierPrice = (
  option: OrderableModifierOption | undefined,
  variantId: string,
) => {
  const scoped = variantId
    ? option?.variantPrices?.find((price) => price.variantId === variantId)
    : undefined;
  return Number(scoped?.additionalPrice ?? option?.additionalPrice ?? 0);
};

export const calculateItemUnitPrice = ({
  item,
  selectedVariantPrice,
  selectedModifiers,
  modifierOptions,
  variantId,
  weightQuantity,
  manualPrice,
  zoned,
}: {
  item: OrderableMenuItem;
  selectedVariantPrice?: string | number | null | undefined;
  selectedModifiers: SelectedModifier[];
  modifierOptions: Map<string, OrderableModifierOption>;
  variantId: string;
  weightQuantity: string;
  manualPrice: string;
  zoned: boolean;
}) => {
  const baseRate = Number(selectedVariantPrice ?? item.basePrice ?? 0);
  const corePrice =
    item.pricingMode === "WEIGHT_BASED"
      ? baseRate * Number(weightQuantity || 0)
      : item.pricingMode === "OPEN"
        ? Number(manualPrice || 0)
        : baseRate;

  const modifierTotalFor = (modifiers: SelectedModifier[]) =>
    modifiers.reduce((sum, modifier) => {
      const option = modifierOptions.get(modifier.optionId);
      return sum + getModifierPrice(option, variantId) * modifier.quantity;
    }, 0);

  if (!zoned) return corePrice + modifierTotalFor(selectedModifiers);

  const whole = modifierTotalFor(
    selectedModifiers.filter((modifier) => modifier.zoneLabel === "WHOLE"),
  );
  const zoneLabels = [
    ...new Set(
      selectedModifiers
        .map((modifier) => modifier.zoneLabel)
        .filter((label): label is string => !!label && label !== "WHOLE"),
    ),
  ];
  const totals = zoneLabels.map((label) =>
    modifierTotalFor(
      selectedModifiers.filter((modifier) => modifier.zoneLabel === label),
    ),
  );
  const rule = item.zonePricingRule ?? "HIGHER";
  const zonedTotal =
    rule === "HIGHER"
      ? Math.max(0, ...totals)
      : rule === "AVERAGE"
        ? totals.reduce((sum, value) => sum + value, 0) /
          Math.max(1, totals.length)
        : totals.reduce((sum, value) => sum + value * 0.5, 0);

  return corePrice + whole + zonedTotal;
};

export const getVisibleModifierGroups = (
  groups: OrderableModifierGroup[],
  selectedModifiers: SelectedModifier[],
) =>
  groups.filter(
    (group) =>
      !group.dependsOnOptionId ||
      selectedModifiers.some(
        (option) => option.optionId === group.dependsOnOptionId,
      ),
  );

export const getUnmetModifierGroup = ({
  visibleGroups,
  selections,
  zoned,
  bucketFor,
}: {
  visibleGroups: OrderableModifierGroup[];
  selections: Record<string, SelectedModifier[]>;
  zoned: boolean;
  bucketFor: (groupId: string, zone?: ZoneLabel) => string;
}) =>
  zoned
    ? (["LEFT", "RIGHT"] as const)
        .flatMap((zone) => visibleGroups.map((group) => ({ ...group, zone })))
        .find(
          (group) =>
            (selections[bucketFor(group.id, group.zone)]?.length ?? 0) <
            group.minSelections,
        )
    : visibleGroups.find(
        (group) => (selections[group.id]?.length ?? 0) < group.minSelections,
      );

export const isPricingInputValid = (
  item: OrderableMenuItem,
  weightQuantity: string,
  manualPrice: string,
) =>
  item.pricingMode === "WEIGHT_BASED"
    ? !!item.weightUnit && Number(weightQuantity) > 0
    : item.pricingMode === "OPEN"
      ? Number.isFinite(Number(manualPrice)) &&
        manualPrice !== "" &&
        Number(manualPrice) >= Number(item.openPriceMin ?? 0) &&
        (item.openPriceMax == null ||
          Number(manualPrice) <= Number(item.openPriceMax))
      : true;

export const buildSimpleCartItem = (
  item: OrderableMenuItem,
  courseMode: boolean,
): CartItem => ({
  menuItemId: item.id,
  name: item.name,
  basePrice: Number(item.basePrice),
  modifiers: [],
  chefNotes: "",
  seatLabel: "",
  ...(courseMode ? { course: 1 } : {}),
  quantity: 1,
  unitPrice: Number(item.basePrice),
});
