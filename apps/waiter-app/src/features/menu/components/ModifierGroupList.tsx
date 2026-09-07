import { Check, Minus, Plus } from "lucide-react";
import type {
  OrderableModifierGroup,
  OrderableModifierOption,
} from "@pos/types";
import type { SelectedModifier } from "@/features/menu/types";

type ZoneLabel = "LEFT" | "RIGHT" | "WHOLE";
export const ModifierGroupList = ({
  groups,
  selections,
  zoned,
  activeZone,
  modifierPrice,
  onSelect,
  onQuantity,
}: {
  groups: OrderableModifierGroup[];
  selections: Record<string, SelectedModifier[]>;
  zoned: boolean;
  activeZone: ZoneLabel;
  modifierPrice: (option: OrderableModifierOption | undefined) => number;
  onSelect: (
    group: OrderableModifierGroup,
    option: OrderableModifierOption,
  ) => void;
  onQuantity: (
    group: OrderableModifierGroup,
    option: OrderableModifierOption,
    value: number,
  ) => void;
}) => (
  <>
    {groups.map((group) => {
      const bucket = zoned ? `${group.id}:${activeZone}` : group.id;
      const picked = selections[bucket] ?? [];
      const atCap =
        group.maxSelections != null && picked.length >= group.maxSelections;
      return (
        <div key={`${group.id}:${zoned ? activeZone : "whole"}`}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {group.name}
              {zoned ? ` · ${activeZone}` : ""}
            </p>
            <span className="text-[11px] text-text-disabled">
              {group.minSelections > 0
                ? `Required · ${group.minSelections}${group.maxSelections ? `–${group.maxSelections}` : "+"}`
                : "Optional"}
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
                const resolvedPrice = modifierPrice(option);
                return (
                  <div
                    key={option.id}
                    className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 ${selected ? "border-primary bg-primary-surface" : disabled ? "border-divider opacity-40" : "border-border"}`}
                  >
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && onSelect(group, option)}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center border-2 ${group.selectionType === "SINGLE" ? "rounded-full" : "rounded"} ${selected ? "border-primary bg-primary" : "border-text-disabled"}`}
                      >
                        {selected && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </span>
                      <span className="text-sm font-medium">{option.name}</span>
                    </button>
                    <div className="flex items-center gap-2">
                      {selected && option.maxQuantity > 1 && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              onQuantity(group, option, selected.quantity - 1)
                            }
                            className="rounded-full bg-surface-secondary p-1"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-4 text-center text-xs">
                            {selected.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onQuantity(group, option, selected.quantity + 1)
                            }
                            className="rounded-full bg-primary p-1 text-primary-foreground"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      <span className="min-w-16 text-right text-sm text-text-secondary">
                        {resolvedPrice > 0
                          ? `+₹${resolvedPrice.toFixed(2)}`
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
