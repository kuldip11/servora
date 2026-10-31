import { BottomSheet, Button } from "@pos/ui";
import { useItemCustomiserModel } from "@/features/menu/hooks/useItemCustomiserModel";
import { ItemCustomiserControls } from "@/features/menu/components/ItemCustomiserControls";
import { ModifierGroupList } from "@/features/menu/components/ModifierGroupList";
import { ItemCustomiserMetaFields } from "@/features/menu/components/ItemCustomiserMetaFields";
import type { ItemCustomiserProps } from "./item-customiser.types";

export const ItemCustomiser = (props: ItemCustomiserProps) => {
  const { item, existingCartItem, onClose, courseMode = false } = props;
  const model = useItemCustomiserModel(props);

  if (model.hidden) return null;

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={item.name}
      footer={
        <Button
          onClick={model.confirm}
          disabled={!!model.unmetGroup || !model.pricingInputValid}
          className="w-full rounded-2xl py-4 justify-between"
        >
          <span>{existingCartItem ? "Update Item" : "Add to Order"}</span>
          <span>₹{(model.unitPrice * model.quantity).toFixed(2)}</span>
        </Button>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-primary font-semibold -mt-1">
          Estimated ₹{model.unitPrice.toFixed(2)} × {model.quantity} = ₹
          {(model.unitPrice * model.quantity).toFixed(2)}{" "}
          <span className="font-normal text-text-secondary">
            · server confirms final price
          </span>
        </p>
        <ItemCustomiserControls
          item={item}
          quantity={model.quantity}
          onQuantity={model.changeQuantity}
          weightQuantity={model.weightQuantity}
          onWeightQuantity={model.changeWeightQuantity}
          manualPrice={model.manualPrice}
          onManualPrice={model.changeManualPrice}
          onPricingBlur={() => model.setPricingValidationVisible(true)}
          variantId={model.variantId}
          onVariant={model.changeVariant}
          zoned={model.zoned}
          activeZone={model.activeZone}
          onZone={model.changeActiveZone}
        />

        {model.guidedBuilder && model.visibleGroups.length > 0 && (
          <div className="rounded-xl bg-primary-surface p-3">
            <p className="text-sm font-semibold text-primary">
              Build your dish · Step {model.boundedGuidedStep + 1} of{" "}
              {model.visibleGroups.length}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Complete each required choice before moving to the next step.
            </p>
          </div>
        )}

        <ModifierGroupList
          groups={model.renderedGroups}
          selections={model.selections}
          zoned={model.zoned}
          activeZone={model.activeZone}
          modifierPrice={model.modifierPrice}
          onSelect={model.selectOption}
          onQuantity={model.setOptionQuantity}
        />

        {model.guidedBuilder && model.visibleGroups.length > 1 && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={model.boundedGuidedStep <= 0}
              onClick={() =>
                model.changeGuidedStep(model.boundedGuidedStep - 1)
              }
              className="flex-1"
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={
                !model.activeGuidedComplete ||
                model.boundedGuidedStep >= model.visibleGroups.length - 1
              }
              onClick={() =>
                model.changeGuidedStep(
                  Math.min(
                    model.visibleGroups.length - 1,
                    model.boundedGuidedStep + 1,
                  ),
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
          course={model.course}
          seatLabel={model.seatLabel}
          chefNotes={model.chefNotes}
          onCourse={model.changeCourse}
          onSeatLabel={model.changeSeatLabel}
          onChefNotes={model.changeChefNotes}
        />
        {model.choiceValidationVisible && model.unmetGroup && (
          <p className="text-center text-xs text-warning">
            Complete required choices for{" "}
            {"zone" in model.unmetGroup ? `${model.unmetGroup.zone} · ` : ""}
            {model.unmetGroup.name}.
          </p>
        )}
        {model.pricingValidationVisible && !model.pricingInputValid && (
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
