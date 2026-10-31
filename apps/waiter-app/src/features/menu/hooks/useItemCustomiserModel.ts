import { useEffect, useMemo, useRef, useState } from "react";
import type {
  OrderableModifierGroup,
  OrderableModifierOption,
} from "@pos/types";
import { itemCustomizationSchema } from "@pos/validation";
import type { SelectedModifier } from "@/features/menu/types";
import type { ItemCustomiserProps } from "@/features/menu/components/item-customiser.types";
import {
  buildSimpleCartItem,
  calculateItemUnitPrice,
  getModifierGroups,
  getModifierPrice,
  getUnmetModifierGroup,
  getVisibleModifierGroups,
  isPricingInputValid,
} from "@/features/menu/components/item-customiser-utils";
import { useItemCustomiserState } from "./useItemCustomiserState";

type ZoneLabel = "LEFT" | "RIGHT" | "WHOLE";

export const useItemCustomiserModel = ({
  item,
  existingCartItem,
  onConfirm,
  onClose,
  courseMode = false,
}: ItemCustomiserProps) => {
  const [choiceValidationVisible, setChoiceValidationVisible] = useState(false);
  const [pricingValidationVisible, setPricingValidationVisible] =
    useState(false);
  const hasVariants = item.variants?.length > 0;
  const groups: OrderableModifierGroup[] = getModifierGroups(item);
  const hasModifierGroups = groups.length > 0;
  const zoned = item.supportsZones === true;
  const requiresPricingInput =
    item.pricingMode === "WEIGHT_BASED" || item.pricingMode === "OPEN";
  const guidedBuilder = item.displayMode === "GUIDED_BUILDER";
  const autoConfirmed = useRef(false);
  const state = useItemCustomiserState(item, existingCartItem, zoned);
  const {
    activeZone,
    variantId,
    selections,
    chefNotes,
    seatLabel,
    course,
    quantity,
    weightQuantity,
    manualPrice,
    guidedStep,
    toggleModifier,
    changeModifierQuantity,
  } = state;

  const selectedVariant = item.variants?.find(
    (variant) => variant.id === variantId,
  );
  const optionById = useMemo(
    () =>
      new Map(
        groups.flatMap((group) =>
          group.options.map((option) => [option.id, option] as const),
        ),
      ),
    [groups],
  );
  const modifierPrice = (option: OrderableModifierOption | undefined) =>
    getModifierPrice(option, variantId);
  const allSelectedModifiers: SelectedModifier[] = (
    Object.values(selections) as SelectedModifier[][]
  ).flat();
  const unitPrice = calculateItemUnitPrice({
    item,
    selectedVariantPrice: selectedVariant?.price,
    selectedModifiers: allSelectedModifiers,
    modifierOptions: optionById,
    variantId,
    weightQuantity,
    manualPrice,
    zoned,
  });

  const hidden =
    !hasVariants &&
    !hasModifierGroups &&
    !existingCartItem &&
    !requiresPricingInput;

  useEffect(() => {
    if (!autoConfirmed.current && hidden) {
      autoConfirmed.current = true;
      onConfirm(buildSimpleCartItem(item, courseMode));
      onClose();
    }
  }, [courseMode, hidden, item, onClose, onConfirm]);

  const bucketFor = (groupId: string, zone: ZoneLabel = activeZone) =>
    zoned ? `${groupId}:${zone}` : groupId;
  const selectOption = (
    group: OrderableModifierGroup,
    option: OrderableModifierOption,
  ) => {
    setChoiceValidationVisible(true);
    toggleModifier({
      bucket: bucketFor(group.id),
      selectionType: group.selectionType,
      maxSelections: group.maxSelections,
      modifier: {
        optionId: option.id,
        groupId: group.id,
        groupName: group.name,
        name: option.name,
        price: modifierPrice(option),
        quantity: 1,
        ...(zoned ? { zoneLabel: activeZone } : {}),
      },
    });
  };
  const setOptionQuantity = (
    group: OrderableModifierGroup,
    option: OrderableModifierOption,
    value: number,
  ) => {
    setChoiceValidationVisible(true);
    changeModifierQuantity(
      bucketFor(group.id),
      option.id,
      value,
      option.maxQuantity ?? 1,
    );
  };

  const visibleGroups = getVisibleModifierGroups(groups, allSelectedModifiers);
  const boundedGuidedStep = Math.min(
    guidedStep,
    Math.max(visibleGroups.length - 1, 0),
  );
  const renderedGroups = guidedBuilder
    ? visibleGroups.slice(boundedGuidedStep, boundedGuidedStep + 1)
    : visibleGroups;
  const activeGuidedGroup = guidedBuilder ? renderedGroups[0] : undefined;
  const activeGuidedBucket = activeGuidedGroup
    ? bucketFor(activeGuidedGroup.id)
    : null;
  const activeGuidedComplete =
    !activeGuidedGroup ||
    (selections[activeGuidedBucket ?? activeGuidedGroup.id]?.length ?? 0) >=
      activeGuidedGroup.minSelections;
  const unmetGroup = getUnmetModifierGroup({
    visibleGroups,
    selections,
    zoned,
    bucketFor,
  });
  const pricingInputValid = isPricingInputValid(
    item,
    weightQuantity,
    manualPrice,
  );

  const confirm = () => {
    if (unmetGroup || !pricingInputValid) return;
    const validated = itemCustomizationSchema.safeParse({
      menuItemId: item.id,
      variantId: variantId || undefined,
      quantity,
      ...(item.pricingMode === "WEIGHT_BASED"
        ? { weightQuantity: Number(weightQuantity) }
        : {}),
      ...(item.pricingMode === "OPEN"
        ? { manualPrice: Number(manualPrice) }
        : {}),
      chefNotes,
      selectedOptions: allSelectedModifiers.map((modifier) => ({
        optionId: modifier.optionId,
        quantity: modifier.quantity,
        ...(modifier.zoneLabel ? { zoneLabel: modifier.zoneLabel } : {}),
      })),
    });
    if (!validated.success) return;
    onConfirm({
      menuItemId: item.id,
      name: item.name,
      basePrice: Number(item.basePrice),
      ...(variantId ? { variantId } : {}),
      ...(selectedVariant ? { variantName: selectedVariant.name } : {}),
      modifiers: allSelectedModifiers,
      chefNotes,
      seatLabel,
      ...(courseMode ? { course } : {}),
      quantity,
      unitPrice,
      ...(item.pricingMode === "WEIGHT_BASED"
        ? {
            weightQuantity: Number(weightQuantity),
            ...(item.weightUnit ? { weightUnit: item.weightUnit } : {}),
          }
        : {}),
      ...(item.pricingMode === "OPEN"
        ? { manualPrice: Number(manualPrice) }
        : {}),
    });
    onClose();
  };

  return {
    ...state,
    hidden,
    zoned,
    guidedBuilder,
    visibleGroups,
    renderedGroups,
    boundedGuidedStep,
    activeGuidedComplete,
    unmetGroup,
    pricingInputValid,
    pricingValidationVisible,
    choiceValidationVisible,
    unitPrice,
    modifierPrice,
    selectOption,
    setOptionQuantity,
    setPricingValidationVisible,
    confirm,
  };
};
