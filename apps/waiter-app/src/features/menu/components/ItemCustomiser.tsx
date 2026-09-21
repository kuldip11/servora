import { useEffect, useMemo, useState } from "react";
import { BottomSheet, Button } from "@pos/ui";
import type { SelectedModifier, CartItem } from "@/features/menu/types";
import type {
  OrderableMenuItem,
  OrderableModifierGroup,
  OrderableModifierOption,
} from "@pos/types";
import { itemCustomizationSchema } from "@pos/validation";
import { useItemCustomiserState } from "@/features/menu/hooks/useItemCustomiserState";
import { ItemCustomiserControls } from "@/features/menu/components/ItemCustomiserControls";
import { ModifierGroupList } from "@/features/menu/components/ModifierGroupList";
import { ItemCustomiserMetaFields } from "@/features/menu/components/ItemCustomiserMetaFields";
import {
  buildSimpleCartItem,
  calculateItemUnitPrice,
  getModifierGroups,
  getModifierPrice,
  getUnmetModifierGroup,
  getVisibleModifierGroups,
  isPricingInputValid,
} from "@/features/menu/components/item-customiser-utils";

interface Props {
  item: OrderableMenuItem;
  existingCartItem?: CartItem;
  onConfirm: (item: CartItem) => void;
  courseMode?: boolean;
  onClose: () => void;
}

type ZoneLabel = "LEFT" | "RIGHT" | "WHOLE";

export const ItemCustomiser = ({
  item,
  existingCartItem,
  onConfirm,
  onClose,
  courseMode = false,
}: Props) => {
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
    changeActiveZone,
    changeVariant,
    toggleModifier,
    changeModifierQuantity,
    changeChefNotes,
    changeSeatLabel,
    changeCourse,
    changeQuantity,
    changeWeightQuantity,
    changeManualPrice,
    changeGuidedStep,
  } = useItemCustomiserState(item, existingCartItem, zoned);

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

  useEffect(() => {
    if (
      !hasVariants &&
      !hasModifierGroups &&
      !existingCartItem &&
      !requiresPricingInput
    ) {
      onConfirm(buildSimpleCartItem(item, courseMode));
      onClose();
    }
  }, []);

  if (
    !hasVariants &&
    !hasModifierGroups &&
    !existingCartItem &&
    !requiresPricingInput
  )
    return null;

  const bucketFor = (groupId: string, zone: ZoneLabel = activeZone) =>
    zoned ? `${groupId}:${zone}` : groupId;
  function selectOption(
    group: OrderableModifierGroup,
    option: OrderableModifierOption,
  ) {
    setChoiceValidationVisible(true);
    const bucket = bucketFor(group.id);
    toggleModifier({
      bucket,
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
  }

  function setOptionQuantity(
    group: OrderableModifierGroup,
    option: OrderableModifierOption,
    value: number,
  ) {
    setChoiceValidationVisible(true);
    changeModifierQuantity(
      bucketFor(group.id),
      option.id,
      value,
      option.maxQuantity ?? 1,
    );
  }

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

  function handleConfirm() {
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
  }

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={item.name}
      footer={
        <Button
          onClick={handleConfirm}
          disabled={!!unmetGroup || !pricingInputValid}
          className="w-full rounded-2xl py-4 justify-between"
        >
          <span>{existingCartItem ? "Update Item" : "Add to Order"}</span>
          <span>₹{(unitPrice * quantity).toFixed(2)}</span>
        </Button>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-primary font-semibold -mt-1">
          Estimated ₹{unitPrice.toFixed(2)} × {quantity} = ₹
          {(unitPrice * quantity).toFixed(2)}{" "}
          <span className="font-normal text-text-secondary">
            · server confirms final price
          </span>
        </p>
        <ItemCustomiserControls
          item={item}
          quantity={quantity}
          onQuantity={changeQuantity}
          weightQuantity={weightQuantity}
          onWeightQuantity={changeWeightQuantity}
          manualPrice={manualPrice}
          onManualPrice={changeManualPrice}
          onPricingBlur={() => setPricingValidationVisible(true)}
          variantId={variantId}
          onVariant={changeVariant}
          zoned={zoned}
          activeZone={activeZone}
          onZone={changeActiveZone}
        />

        {guidedBuilder && visibleGroups.length > 0 && (
          <div className="rounded-xl bg-primary-surface p-3">
            <p className="text-sm font-semibold text-primary">
              Build your dish · Step {boundedGuidedStep + 1} of{" "}
              {visibleGroups.length}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Complete each required choice before moving to the next step.
            </p>
          </div>
        )}

        <ModifierGroupList
          groups={renderedGroups}
          selections={selections}
          zoned={zoned}
          activeZone={activeZone}
          modifierPrice={modifierPrice}
          onSelect={selectOption}
          onQuantity={setOptionQuantity}
        />

        {guidedBuilder && visibleGroups.length > 1 && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={boundedGuidedStep <= 0}
              onClick={() => changeGuidedStep(boundedGuidedStep - 1)}
              className="flex-1"
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={
                !activeGuidedComplete ||
                boundedGuidedStep >= visibleGroups.length - 1
              }
              onClick={() =>
                changeGuidedStep(
                  Math.min(visibleGroups.length - 1, boundedGuidedStep + 1),
                )
              }
              className="flex-1"
            >
              Next step
            </Button>
          </div>
        )}

        <ItemCustomiserMetaFields
          courseMode={courseMode}
          course={course}
          seatLabel={seatLabel}
          chefNotes={chefNotes}
          onCourse={changeCourse}
          onSeatLabel={changeSeatLabel}
          onChefNotes={changeChefNotes}
        />
        {choiceValidationVisible && unmetGroup && (
          <p className="text-center text-xs text-warning">
            Complete required choices for{" "}
            {"zone" in unmetGroup ? `${unmetGroup.zone} · ` : ""}
            {unmetGroup.name}.
          </p>
        )}
        {pricingValidationVisible && !pricingInputValid && (
          <p className="text-center text-xs text-danger">
            Enter a valid{" "}
            {item.pricingMode === "WEIGHT_BASED"
              ? "positive weight"
              : "manual price within the configured range"}
            .
          </p>
        )}
      </div>
    </BottomSheet>
  );
};
