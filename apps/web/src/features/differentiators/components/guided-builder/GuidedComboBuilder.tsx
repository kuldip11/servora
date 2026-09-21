import { Button, Card, Select } from "@pos/ui";
import { DIFFERENTIATORS_INPUT_CLASS } from "@/features/differentiators/constants";
import type { ComboPolicy, ComboSlotDraft, MenuChoice } from "./types";

type Props = {
  busy: boolean;
  comboName: string;
  comboPolicy: ComboPolicy;
  comboValue: string;
  comboSlots: ComboSlotDraft[];
  menuChoices: MenuChoice[];
  preview: number | null;
  ready: boolean;
  onNameChange: (value: string) => void;
  onPolicyChange: (value: ComboPolicy) => void;
  onValueChange: (value: string) => void;
  onSlotsChange: (
    updater: (current: ComboSlotDraft[]) => ComboSlotDraft[],
  ) => void;
  onPreview: () => void;
  onCreate: () => void;
};

const PRICING_OPTIONS = [
  { value: "FIXED", label: "Fixed total" },
  { value: "PERCENT_OFF_SUM", label: "Percent off components" },
];

export const GuidedComboBuilder = ({
  busy,
  comboName,
  comboPolicy,
  comboValue,
  comboSlots,
  menuChoices,
  preview,
  ready,
  onNameChange,
  onPolicyChange,
  onValueChange,
  onSlotsChange,
  onPreview,
  onCreate,
}: Props) => (
  <Card>
    <h2 className="font-semibold">Guided combo builder</h2>
    <p className="mt-1 text-sm text-text-secondary">
      Step 1: name the offer. Step 2: choose real menu items by name. Step 3:
      preview through the same server pricing stages used by order creation.
    </p>
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm font-medium text-text-primary">
          Combo name
          <input
            className={`mt-1 w-full ${DIFFERENTIATORS_INPUT_CLASS}`}
            value={comboName}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Lunch combo"
          />
        </label>
        <Select
          label="Pricing"
          value={comboPolicy}
          onChange={(value) => onPolicyChange(value as ComboPolicy)}
          options={PRICING_OPTIONS}
        />
        <label className="text-sm font-medium text-text-primary">
          {comboPolicy === "FIXED" ? "Fixed price" : "Percent off"}
          <input
            className={`mt-1 w-full ${DIFFERENTIATORS_INPUT_CLASS}`}
            type="number"
            min="0"
            max={comboPolicy === "PERCENT_OFF_SUM" ? "100" : undefined}
            step="0.01"
            value={comboValue}
            onChange={(event) => onValueChange(event.target.value)}
          />
        </label>
      </div>
      <div className="space-y-3">
        {comboSlots.map((slot, index) => (
          <div
            key={slot.id}
            className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-[1fr_2fr_1fr_auto] md:items-end"
          >
            <label className="text-sm font-medium text-text-primary">
              Slot {index + 1}
              <input
                className={`mt-1 w-full ${DIFFERENTIATORS_INPUT_CLASS}`}
                value={slot.name}
                onChange={(event) =>
                  onSlotsChange((current) =>
                    current.map((value) =>
                      value.id === slot.id
                        ? { ...value, name: event.target.value }
                        : value,
                    ),
                  )
                }
              />
            </label>
            <Select
              label="Menu item"
              value={slot.menuItemId}
              onChange={(menuItemId) =>
                onSlotsChange((current) =>
                  current.map((value) =>
                    value.id === slot.id ? { ...value, menuItemId } : value,
                  ),
                )
              }
              options={[
                { value: "", label: "Choose an item" },
                ...menuChoices.map((choice) => ({
                  value: choice.id,
                  label: `${choice.categoryName} — ${choice.name}`,
                })),
              ]}
            />
            <label className="text-sm font-medium text-text-primary">
              Upcharge
              <input
                className={`mt-1 w-full ${DIFFERENTIATORS_INPUT_CLASS}`}
                type="number"
                step="0.01"
                value={slot.upcharge}
                onChange={(event) =>
                  onSlotsChange((current) =>
                    current.map((value) =>
                      value.id === slot.id
                        ? { ...value, upcharge: event.target.value }
                        : value,
                    ),
                  )
                }
              />
            </label>
            <Button
              variant="secondary"
              disabled={comboSlots.length === 1}
              onClick={() =>
                onSlotsChange((current) =>
                  current.filter((value) => value.id !== slot.id),
                )
              }
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          variant="secondary"
          onClick={() =>
            onSlotsChange((current) => [
              ...current,
              {
                id: Math.max(0, ...current.map((slot) => slot.id)) + 1,
                name: `Choice ${current.length + 1}`,
                menuItemId: "",
                upcharge: "0",
              },
            ])
          }
        >
          + Add slot
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          loading={busy}
          disabled={!ready}
          onClick={onPreview}
        >
          Preview authoritative price
        </Button>
        <Button
          loading={busy}
          disabled={!ready || preview === null}
          onClick={onCreate}
        >
          Create combo
        </Button>
        {preview !== null ? (
          <strong>Resolved total: ₹{preview.toFixed(2)}</strong>
        ) : null}
      </div>
    </div>
  </Card>
);
