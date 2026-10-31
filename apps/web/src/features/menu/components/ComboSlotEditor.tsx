import { Button, Input, Select } from "@pos/ui";
import {
  comboFieldKey,
  type DraftOption,
  type DraftSlot,
} from "@/features/menu/helpers/combo-form";
import type { ComboItemChoice } from "./combo-types";

type Props = {
  slot: DraftSlot;
  slotIndex: number;
  slotsCount: number;
  itemChoices: ComboItemChoice[];
  visibleError: (key: string) => string | undefined;
  touchField: (key: string) => void;
  clearFieldError: (key: string) => void;
  updateSlots: (updater: (current: DraftSlot[]) => DraftSlot[]) => void;
  newOption: () => DraftOption;
};

export const ComboSlotEditor = ({
  slot,
  slotIndex,
  slotsCount,
  itemChoices,
  visibleError,
  touchField,
  clearFieldError,
  updateSlots,
  newOption,
}: Props) => (
  <div className="rounded-lg border border-border p-4">
    <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
      <Input
        label={`Slot ${slotIndex + 1}`}
        required
        value={slot.name}
        error={visibleError(comboFieldKey.slotName(slot.key))}
        onBlur={() => touchField(comboFieldKey.slotName(slot.key))}
        onChange={(event) => {
          clearFieldError(comboFieldKey.slotName(slot.key));
          updateSlots((current) =>
            current.map((value) =>
              value.key === slot.key
                ? { ...value, name: event.target.value }
                : value,
            ),
          );
        }}
      />
      <Input
        label="Minimum"
        required
        type="number"
        min="0"
        value={slot.minSelections}
        error={visibleError(comboFieldKey.slotMin(slot.key))}
        onBlur={() => touchField(comboFieldKey.slotMin(slot.key))}
        onChange={(event) => {
          clearFieldError(comboFieldKey.slotMin(slot.key));
          updateSlots((current) =>
            current.map((value) =>
              value.key === slot.key
                ? { ...value, minSelections: event.target.value }
                : value,
            ),
          );
        }}
      />
      <Input
        label="Maximum"
        required
        type="number"
        min="1"
        value={slot.maxSelections}
        error={visibleError(comboFieldKey.slotMax(slot.key))}
        onBlur={() => touchField(comboFieldKey.slotMax(slot.key))}
        onChange={(event) => {
          clearFieldError(comboFieldKey.slotMax(slot.key));
          updateSlots((current) =>
            current.map((value) =>
              value.key === slot.key
                ? { ...value, maxSelections: event.target.value }
                : value,
            ),
          );
        }}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={slotsCount === 1}
        onClick={() =>
          updateSlots((current) =>
            current.filter((value) => value.key !== slot.key),
          )
        }
      >
        Remove slot
      </Button>
    </div>

    <div className="mt-3 space-y-2">
      {slot.options.map((option, optionIndex) => {
        const selectedItem = itemChoices.find(
          (item) => item.id === option.menuItemId,
        );
        return (
          <div
            key={option.key}
            className="grid gap-2 rounded-md bg-surface-secondary p-3 md:grid-cols-[2fr_1.3fr_1fr_auto_auto] md:items-end"
          >
            <Select
              label={`Choice ${optionIndex + 1}`}
              required
              value={option.menuItemId}
              options={[
                { value: "", label: "Choose an item" },
                ...itemChoices.map((item) => ({
                  value: item.id,
                  label: item.label,
                })),
              ]}
              error={visibleError(
                comboFieldKey.optionItem(slot.key, option.key),
              )}
              onBlur={() =>
                touchField(comboFieldKey.optionItem(slot.key, option.key))
              }
              onChange={(value) => {
                clearFieldError(comboFieldKey.optionItem(slot.key, option.key));
                updateSlots((current) =>
                  current.map((candidateSlot) =>
                    candidateSlot.key === slot.key
                      ? {
                          ...candidateSlot,
                          options: candidateSlot.options.map((candidate) =>
                            candidate.key === option.key
                              ? {
                                  ...candidate,
                                  menuItemId: value,
                                  variantId: "",
                                }
                              : candidate,
                          ),
                        }
                      : candidateSlot,
                  ),
                );
              }}
            />
            <Select
              label="Variant"
              value={option.variantId}
              disabled={!selectedItem?.variants.length}
              options={[
                { value: "", label: "Default" },
                ...(selectedItem?.variants ?? []).map((variant) => ({
                  value: variant.id,
                  label: variant.name,
                })),
              ]}
              onChange={(value) =>
                updateSlots((current) =>
                  current.map((candidateSlot) =>
                    candidateSlot.key === slot.key
                      ? {
                          ...candidateSlot,
                          options: candidateSlot.options.map((candidate) =>
                            candidate.key === option.key
                              ? { ...candidate, variantId: value }
                              : candidate,
                          ),
                        }
                      : candidateSlot,
                  ),
                )
              }
            />
            <Input
              label="Upcharge"
              type="number"
              step="0.01"
              value={option.upcharge}
              error={visibleError(
                comboFieldKey.optionUpcharge(slot.key, option.key),
              )}
              onBlur={() =>
                touchField(comboFieldKey.optionUpcharge(slot.key, option.key))
              }
              onChange={(event) => {
                clearFieldError(
                  comboFieldKey.optionUpcharge(slot.key, option.key),
                );
                updateSlots((current) =>
                  current.map((candidateSlot) =>
                    candidateSlot.key === slot.key
                      ? {
                          ...candidateSlot,
                          options: candidateSlot.options.map((candidate) =>
                            candidate.key === option.key
                              ? { ...candidate, upcharge: event.target.value }
                              : candidate,
                          ),
                        }
                      : candidateSlot,
                  ),
                );
              }}
            />
            <label className="flex h-10 items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={option.isUnlimitedRefill}
                onChange={(event) =>
                  updateSlots((current) =>
                    current.map((candidateSlot) =>
                      candidateSlot.key === slot.key
                        ? {
                            ...candidateSlot,
                            options: candidateSlot.options.map((candidate) =>
                              candidate.key === option.key
                                ? {
                                    ...candidate,
                                    isUnlimitedRefill: event.target.checked,
                                  }
                                : candidate,
                            ),
                          }
                        : candidateSlot,
                    ),
                  )
                }
              />
              Refill
            </label>
            <Button
              type="button"
              variant="secondary"
              disabled={slot.options.length === 1}
              onClick={() =>
                updateSlots((current) =>
                  current.map((candidateSlot) =>
                    candidateSlot.key === slot.key
                      ? {
                          ...candidateSlot,
                          options: candidateSlot.options.filter(
                            (candidate) => candidate.key !== option.key,
                          ),
                        }
                      : candidateSlot,
                  ),
                )
              }
            >
              Remove
            </Button>
          </div>
        );
      })}
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          updateSlots((current) =>
            current.map((value) =>
              value.key === slot.key
                ? { ...value, options: [...value.options, newOption()] }
                : value,
            ),
          )
        }
      >
        + Add choice
      </Button>
    </div>
  </div>
);
