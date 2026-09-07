import { useEffect, useMemo } from "react";
import { BottomSheet, Button, TextInput } from "@pos/ui";
import type { SelectedModifier, CartItem } from "@/features/menu/types";
import type {
  OrderableMenuItem,
  OrderableModifierGroup,
  OrderableModifierOption,
} from "@pos/types";
import { COURSE_LABELS } from "@/features/menu/constants";
import { itemCustomizationSchema } from "@pos/validation";
import { useItemCustomiserState } from "@/features/menu/hooks/useItemCustomiserState";
import { ItemCustomiserControls } from "@/features/menu/components/ItemCustomiserControls";
import { ModifierGroupList } from "@/features/menu/components/ModifierGroupList";

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
  const hasVariants = item.variants?.length > 0;
  const groups: OrderableModifierGroup[] = (item.modifierGroupLinks ?? []).map(
    (link) => link.group,
  );
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
  const modifierPrice = (option: OrderableModifierOption | undefined) => {
    const scoped = variantId
      ? option?.variantPrices?.find((price) => price.variantId === variantId)
      : undefined;
    return Number(scoped?.additionalPrice ?? option?.additionalPrice ?? 0);
  };
  const allSelectedModifiers: SelectedModifier[] = (
    Object.values(selections) as SelectedModifier[][]
  ).flat();
  const baseRate = Number(selectedVariant?.price ?? item.basePrice ?? 0);
  const corePrice =
    item.pricingMode === "WEIGHT_BASED"
      ? baseRate * Number(weightQuantity || 0)
      : item.pricingMode === "OPEN"
        ? Number(manualPrice || 0)
        : baseRate;
  const modifierTotalFor = (mods: SelectedModifier[]) =>
    mods.reduce((sum, modifier) => {
      const option = optionById.get(modifier.optionId);
      return sum + modifierPrice(option) * modifier.quantity;
    }, 0);
  const modifierTotal = (() => {
    if (!zoned) return modifierTotalFor(allSelectedModifiers);
    const whole = modifierTotalFor(
      allSelectedModifiers.filter((modifier) => modifier.zoneLabel === "WHOLE"),
    );
    const zoneLabels = [
      ...new Set(
        allSelectedModifiers
          .map((modifier) => modifier.zoneLabel)
          .filter((label): label is string => !!label && label !== "WHOLE"),
      ),
    ];
    const totals = zoneLabels.map((label) =>
      modifierTotalFor(
        allSelectedModifiers.filter((modifier) => modifier.zoneLabel === label),
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
    return whole + zonedTotal;
  })();
  const unitPrice = corePrice + modifierTotal;

  useEffect(() => {
    if (
      !hasVariants &&
      !hasModifierGroups &&
      !existingCartItem &&
      !requiresPricingInput
    ) {
      onConfirm({
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
    changeModifierQuantity(
      bucketFor(group.id),
      option.id,
      value,
      option.maxQuantity ?? 1,
    );
  }

  const visibleGroups = groups.filter(
    (group) =>
      !group.dependsOnOptionId ||
      allSelectedModifiers.some(
        (option) => option.optionId === group.dependsOnOptionId,
      ),
  );
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
  const unmetGroup = zoned
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
  const pricingInputValid =
    item.pricingMode === "WEIGHT_BASED"
      ? !!item.weightUnit && Number(weightQuantity) > 0
      : item.pricingMode === "OPEN"
        ? Number.isFinite(Number(manualPrice)) &&
          manualPrice !== "" &&
          Number(manualPrice) >= Number(item.openPriceMin ?? 0) &&
          (item.openPriceMax == null ||
            Number(manualPrice) <= Number(item.openPriceMax))
        : true;

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

        {courseMode && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Course
            </p>
            <div className="flex gap-2">
              {([1, 2, 3] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => changeCourse(value)}
                  className={`flex-1 rounded-xl border-2 py-2.5 text-xs font-semibold ${course === value ? "border-primary bg-primary-surface text-primary" : "border-border text-text-secondary"}`}
                >
                  {COURSE_LABELS[value]}
                </button>
              ))}
            </div>
          </div>
        )}
        <TextInput
          label="Seat / diner (optional)"
          placeholder="e.g. Seat 1 or Priya"
          value={seatLabel}
          onChange={(event) => changeSeatLabel(event.target.value)}
        />
        <TextInput
          label="Note for Chef"
          placeholder="e.g. no onion, extra spicy…"
          value={chefNotes}
          onChange={(event) => changeChefNotes(event.target.value)}
          className="rounded-xl bg-surface-secondary"
        />
        {unmetGroup && (
          <p className="text-center text-xs text-warning">
            Complete required choices for{" "}
            {"zone" in unmetGroup ? `${unmetGroup.zone} · ` : ""}
            {unmetGroup.name}.
          </p>
        )}
        {!pricingInputValid && (
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
