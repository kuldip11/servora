import { memo } from "react";
import { BottomSheet, Button } from "@pos/ui";
import type { CustomerCombo, CustomerMenuItem } from "./api";
import type { CustomerComboSelection } from "@/features/cart";
import { estimateComboLine } from "@/features/cart";
import { formatMoney } from "@/shared/utils/money";

type Props = {
  combo: CustomerCombo;
  menuById: Map<string, CustomerMenuItem>;
  selections: CustomerComboSelection[];
  onToggle: (slotId: string, optionId: string) => void;
  onClose: () => void;
  onAdd: () => void;
};

export const ComboCustomization = memo(function ComboCustomization({
  combo,
  menuById,
  selections,
  onToggle,
  onClose,
  onAdd,
}: Props) {
  const valid = combo.slots.every((slot) => {
    const count =
      selections.find((value) => value.slotId === slot.id)?.optionIds.length ??
      0;
    return count >= slot.minSelections && count <= slot.maxSelections;
  });
  const estimate = estimateComboLine(
    { combo, selections, quantity: 1 },
    menuById,
  );

  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Build a set meal"
      description={
        combo.description ??
        "Complete each combo choice before adding it to your order."
      }
      maxHeight="94vh"
      contentClassName="customer-sheet sm:left-1/2 sm:right-auto sm:w-full sm:max-w-2xl sm:-translate-x-1/2"
      bodyClassName="customer-scrollbar-hidden px-4 pb-6 sm:px-7"
      footerClassName="bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-7"
      footer={
        <Button
          size="lg"
          disabled={!valid}
          onClick={onAdd}
          className="h-12 w-full rounded-2xl"
        >
          Add combo · est. {formatMoney(estimate.subtotal)}
        </Button>
      }
    >
      <div className="space-y-7">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#d45d24]">
            Build your set meal
          </p>
          <h2 className="customer-display mt-1 text-3xl font-bold text-text-primary">
            {combo.name}
          </h2>
          {combo.description && (
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {combo.description}
            </p>
          )}
        </div>
        <p className="rounded-2xl bg-primary-surface p-4 text-sm leading-6 text-primary">
          Combo prices shown here are estimates. Final pricing is recalculated
          by the restaurant when you place the order.
        </p>
        {combo.slots
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((slot, index) => {
            const chosen =
              selections.find((value) => value.slotId === slot.id)?.optionIds ??
              [];
            return (
              <fieldset key={slot.id}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <legend className="font-bold text-text-primary">
                    Step {index + 1}: {slot.name}
                  </legend>
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#d45d24]">
                    Choose {slot.minSelections}
                    {slot.maxSelections !== slot.minSelections
                      ? `–${slot.maxSelections}`
                      : ""}
                  </span>
                </div>
                <div className="overflow-hidden rounded-2xl border border-border bg-surface px-4">
                  {slot.options.map((option) => {
                    const item = menuById.get(option.menuItemId);
                    if (!item) return null;
                    const variant = option.variantId
                      ? item.variants.find(
                          (value) => value.id === option.variantId,
                        )
                      : undefined;
                    const selected = chosen.includes(option.id);
                    return (
                      <button
                        type="button"
                        key={option.id}
                        onClick={() => onToggle(slot.id, option.id)}
                        className="flex min-h-14 w-full items-center justify-between border-b border-border py-3 text-left last:border-b-0"
                      >
                        <span>
                          <span className="block font-medium text-text-primary">
                            {item.name}
                            {variant ? ` · ${variant.name}` : ""}
                          </span>
                          {Number(option.upcharge) > 0 && (
                            <span className="text-xs text-text-secondary">
                              +{formatMoney(Number(option.upcharge))} upcharge
                            </span>
                          )}
                        </span>
                        <span
                          aria-hidden="true"
                          className={`h-5 w-5 rounded-full border-2 ${selected ? "border-primary bg-primary shadow-[inset_0_0_0_4px_var(--surface)]" : "border-border"}`}
                        />
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
      </div>
    </BottomSheet>
  );
});
