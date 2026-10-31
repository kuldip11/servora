import { Button, Card, FormErrorSummary, Input, Select } from "@pos/ui";
import type {
  ComboPolicy,
  DraftOption,
  DraftSlot,
} from "@/features/menu/helpers/combo-form";
import { comboFieldKey } from "@/features/menu/helpers/combo-form";
import type { ComboItemChoice } from "./combo-types";
import { ComboSlotEditor } from "./ComboSlotEditor";

type Props = {
  editing: boolean;
  name: string;
  description: string;
  policy: ComboPolicy;
  amount: string;
  slots: DraftSlot[];
  itemChoices: ComboItemChoice[];
  formErrorMessages: string[];
  visibleError: (key: string) => string | undefined;
  touchField: (key: string) => void;
  clearFieldError: (key: string) => void;
  setName: (value: string) => void;
  setDescription: (value: string) => void;
  setPolicy: (value: ComboPolicy) => void;
  setAmount: (value: string) => void;
  updateSlots: (updater: (current: DraftSlot[]) => DraftSlot[]) => void;
  addSlot: () => void;
  newOption: () => DraftOption;
  valid: boolean;
  isDirty: boolean;
  isSaving: boolean;
  dependencyUnavailable: boolean;
  combosUnavailable: boolean;
  onSubmit: () => void;
  onCancel: () => void;
};

export const ComboEditor = ({
  editing,
  name,
  description,
  policy,
  amount,
  slots,
  itemChoices,
  formErrorMessages,
  visibleError,
  touchField,
  clearFieldError,
  setName,
  setDescription,
  setPolicy,
  setAmount,
  updateSlots,
  addSlot,
  newOption,
  valid,
  isDirty,
  isSaving,
  dependencyUnavailable,
  combosUnavailable,
  onSubmit,
  onCancel,
}: Props) => (
  <Card id="combo-editor">
    <FormErrorSummary messages={formErrorMessages} />
    <div className="grid gap-3 md:grid-cols-2">
      <Input
        label="Combo name"
        required
        value={name}
        error={visibleError(comboFieldKey.name)}
        onBlur={() => touchField(comboFieldKey.name)}
        onChange={(event) => {
          clearFieldError(comboFieldKey.name);
          setName(event.target.value);
        }}
      />
      <Input
        label="Description (optional)"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <Select
        label="Pricing"
        required
        value={policy}
        options={[
          { value: "FIXED", label: "Fixed total" },
          { value: "PERCENT_OFF_SUM", label: "Percent off components" },
        ]}
        onChange={(value) => {
          clearFieldError(comboFieldKey.amount);
          setPolicy(value as ComboPolicy);
        }}
      />
      <Input
        label={policy === "FIXED" ? "Fixed price" : "Percent off"}
        required
        type="number"
        min="0"
        max={policy === "PERCENT_OFF_SUM" ? "100" : undefined}
        step="0.01"
        value={amount}
        error={visibleError(comboFieldKey.amount)}
        onBlur={() => touchField(comboFieldKey.amount)}
        onChange={(event) => {
          clearFieldError(comboFieldKey.amount);
          setAmount(event.target.value);
        }}
      />
    </div>

    <div className="mt-5 space-y-4">
      {slots.map((slot, slotIndex) => (
        <ComboSlotEditor
          key={slot.key}
          slot={slot}
          slotIndex={slotIndex}
          slotsCount={slots.length}
          itemChoices={itemChoices}
          visibleError={visibleError}
          touchField={touchField}
          clearFieldError={clearFieldError}
          updateSlots={updateSlots}
          newOption={newOption}
        />
      ))}
      <Button type="button" variant="secondary" onClick={addSlot}>
        + Add slot
      </Button>
    </div>

    <div className="mt-5 flex gap-2">
      <Button
        disabled={
          !valid ||
          !isDirty ||
          isSaving ||
          dependencyUnavailable ||
          combosUnavailable
        }
        loading={isSaving}
        onClick={onSubmit}
      >
        {editing ? "Save combo" : "Create combo"}
      </Button>
      {editing ? (
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel edit
        </Button>
      ) : null}
    </div>
  </Card>
);
