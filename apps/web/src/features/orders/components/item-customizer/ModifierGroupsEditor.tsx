import { Check, Minus, Plus } from "lucide-react";
import { formatCurrency } from "@/shared/utils/format";
import type { SelectedModifier } from "@/features/orders/utils/cartTypes";
import type { ModifierGroup, ModifierOption } from "@pos/types";

type Props = {
  groups: ModifierGroup[];
  selections: Record<string, SelectedModifier[]>;
  onSelectOption: (group: ModifierGroup, option: ModifierOption) => void;
  onSetOptionQuantity: (
    group: ModifierGroup,
    option: ModifierOption,
    quantity: number,
  ) => void;
};

export const ModifierGroupsEditor = ({
  groups,
  selections,
  onSelectOption,
  onSetOptionQuantity,
}: Props) => {
  const selectedOptions = Object.values(selections).flat();
  const visibleGroups = groups.filter(
    (group) =>
      !group.dependsOnOptionId ||
      selectedOptions.some(
        (option) => option.optionId === group.dependsOnOptionId,
      ),
  );

  return (
    <>
      {visibleGroups.map((group) => {
        const picked = selections[group.id] ?? [];
        const atCap =
          group.maxSelections != null && picked.length >= group.maxSelections;
        const guidance =
          group.minSelections > 0
            ? `Required · choose ${group.minSelections}${group.maxSelections ? `–${group.maxSelections}` : "+"}`
            : group.selectionType === "SINGLE"
              ? "Optional · choose 1"
              : `Optional${group.maxSelections ? ` · up to ${group.maxSelections}` : ""}`;

        return (
          <div key={group.id}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {group.name}
              </p>
              <span
                className={`text-[11px] font-medium ${group.minSelections > 0 ? "text-warning" : "text-text-disabled"}`}
              >
                {guidance}
              </span>
            </div>
            <div className="space-y-2">
              {group.options
                .filter((option) => option.isAvailable)
                .map((option) => {
                  const selected = picked.find(
                    (modifier) => modifier.optionId === option.id,
                  );
                  const disabled =
                    !selected && group.selectionType === "MULTIPLE" && atCap;
                  return (
                    <div
                      key={option.id}
                      className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-2.5 transition-all ${selected ? "border-primary bg-primary-surface" : disabled ? "border-divider opacity-40" : "border-border"}`}
                    >
                      <button
                        onClick={() =>
                          !disabled && onSelectOption(group, option)
                        }
                        disabled={disabled}
                        className="flex flex-1 items-center gap-2 text-left"
                      >
                        <div
                          className={`flex h-4 w-4 items-center justify-center border-2 ${group.selectionType === "SINGLE" ? "rounded-full" : "rounded"} ${selected ? "border-primary bg-primary" : "border-text-disabled"}`}
                        >
                          {selected ? (
                            group.selectionType === "SINGLE" ? (
                              <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                            ) : (
                              <Check className="h-3 w-3 text-primary-foreground" />
                            )
                          ) : null}
                        </div>
                        <span className="text-sm font-medium text-text-primary">
                          {option.name}
                        </span>
                      </button>
                      <div className="flex items-center gap-2">
                        {selected && option.maxQuantity > 1 ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                onSetOptionQuantity(
                                  group,
                                  option,
                                  selected.quantity - 1,
                                )
                              }
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-secondary text-text-secondary"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-4 text-center text-xs font-semibold">
                              {selected.quantity}
                            </span>
                            <button
                              onClick={() =>
                                onSetOptionQuantity(
                                  group,
                                  option,
                                  selected.quantity + 1,
                                )
                              }
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        ) : null}
                        <span className="min-w-[3.5rem] text-right text-sm text-text-secondary">
                          {Number(option.additionalPrice) > 0
                            ? `+${formatCurrency(Number(option.additionalPrice))}`
                            : "Free"}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}
    </>
  );
};
