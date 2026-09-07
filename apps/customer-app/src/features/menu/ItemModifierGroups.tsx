import { Minus, Plus } from "lucide-react";
import { IconButton } from "@pos/ui";

import type { CustomerMenuItem } from "@/api";
import type { SelectedOption } from "@/features/cart/pricing";
import { formatMoney } from "@/shared/utils/money";

type Zone = "LEFT" | "RIGHT" | "WHOLE";

type Props = {
  item: CustomerMenuItem;
  selectedOptions: SelectedOption[];
  variantId?: string | undefined;
  activeZone: Zone;
  onZoneChange: (zone: Zone) => void;
  onToggle: (optionId: string, groupId: string, zoneLabel?: Zone) => void;
  onOptionQuantity: (optionId: string, delta: number, zoneLabel?: Zone) => void;
};

export const ItemModifierGroups = ({
  item,
  selectedOptions,
  variantId,
  activeZone,
  onZoneChange,
  onToggle,
  onOptionQuantity,
}: Props) => {
  const visibleGroups = item.modifierGroupLinks.filter(
    ({ group }) =>
      !group.dependsOnOptionId ||
      selectedOptions.some(
        (option) => option.optionId === group.dependsOnOptionId,
      ),
  );

  return (
    <>
      {item.supportsZones && (
        <div className="rounded-lg border border-border p-3">
          <p className="mb-2 text-sm font-semibold text-text-primary">
            Choose toppings by zone
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(["LEFT", "RIGHT", "WHOLE"] as const).map((zone) => (
              <button
                key={zone}
                type="button"
                onClick={() => onZoneChange(zone)}
                className={`rounded-xl px-3 py-2.5 text-xs font-semibold ${activeZone === zone ? "bg-primary text-primary-foreground" : "bg-surface-secondary text-text-secondary"}`}
              >
                {zone === "WHOLE"
                  ? "Whole"
                  : zone === "LEFT"
                    ? "Left half"
                    : "Right half"}
              </button>
            ))}
          </div>
        </div>
      )}

      {item.displayMode === "GUIDED_BUILDER" && (
        <p className="rounded-lg bg-primary-surface p-3 text-sm font-medium text-primary">
          Build your dish · complete each required step
        </p>
      )}

      {visibleGroups.map(({ group }, groupIndex) => (
        <fieldset key={group.id}>
          <div className="mb-3 flex items-start justify-between gap-4">
            <legend className="font-bold text-text-primary">
              {item.displayMode === "GUIDED_BUILDER"
                ? `Step ${groupIndex + 1}: `
                : ""}
              {group.name}
            </legend>
            <span
              className={`text-[10px] font-extrabold uppercase tracking-[0.1em] ${group.minSelections > 0 ? "text-[#d45d24]" : "text-text-secondary"}`}
            >
              {group.minSelections > 0
                ? `Choose ${group.minSelections}${group.maxSelections ? `–${group.maxSelections}` : "+"}`
                : "Optional"}
            </span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface px-4">
            {group.options
              .filter((option) => option.isAvailable)
              .map((option) => {
                const selected = selectedOptions.find(
                  (selection) =>
                    selection.optionId === option.id &&
                    (!item.supportsZones ||
                      (selection.zoneLabel ?? "WHOLE") === activeZone),
                );
                const multiple = group.selectionType === "MULTIPLE";
                const canIncrease =
                  multiple &&
                  selected != null &&
                  selected.quantity < option.maxQuantity;
                const zone = item.supportsZones ? activeZone : undefined;
                const additionalPrice =
                  (variantId
                    ? option.variantPrices?.find(
                        (price) => price.variantId === variantId,
                      )?.additionalPrice
                    : undefined) ?? option.additionalPrice;

                return (
                  <div
                    key={option.id}
                    className="flex min-h-14 items-center justify-between border-b border-border py-3 last:border-b-0"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => onToggle(option.id, group.id, zone)}
                    >
                      <span className="block font-medium text-text-primary">
                        {option.name}
                      </span>
                      <span className="text-sm text-text-secondary">
                        +{formatMoney(Number(additionalPrice))}
                      </span>
                    </button>
                    {multiple && selected ? (
                      <div className="ml-3 flex items-center gap-2">
                        <IconButton
                          aria-label={`Decrease ${option.name}`}
                          icon={Minus}
                          size="sm"
                          onClick={() => onOptionQuantity(option.id, -1, zone)}
                        />
                        <span className="w-5 text-center text-sm font-semibold">
                          {selected.quantity}
                        </span>
                        <IconButton
                          aria-label={`Increase ${option.name}`}
                          icon={Plus}
                          size="sm"
                          disabled={!canIncrease}
                          onClick={() => onOptionQuantity(option.id, 1, zone)}
                        />
                      </div>
                    ) : (
                      <span
                        aria-hidden="true"
                        className={`ml-3 h-5 w-5 rounded-full border-2 ${selected ? "border-primary bg-primary shadow-[inset_0_0_0_4px_var(--surface)]" : "border-border"}`}
                      />
                    )}
                  </div>
                );
              })}
          </div>
        </fieldset>
      ))}
    </>
  );
};
