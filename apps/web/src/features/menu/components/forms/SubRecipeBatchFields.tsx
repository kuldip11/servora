import { Input, Select } from "@pos/ui";
import type { InventoryUnitDto } from "@pos/api-client";
import { INVENTORY_UNITS } from "@/features/menu/constants";
import type { SubRecipeEditorForm } from "@/features/menu/hooks/useSubRecipeEditorForm";

export const SubRecipeBatchFields = ({
  form,
}: {
  form: SubRecipeEditorForm;
}) => (
  <div className="grid gap-3 sm:grid-cols-4">
    <Input
      label="Name"
      required
      value={form.name}
      error={form.formErrors.fieldError("name", form.clientErrors.name)}
      onBlur={() => form.formErrors.touchField("name")}
      onChange={(event) => {
        form.formErrors.clearFieldError("name");
        form.setName(event.target.value);
      }}
      placeholder="House tomato sauce"
    />
    <Input
      label="Batch yield"
      required
      type="number"
      min="0.001"
      step="0.001"
      value={form.yieldQuantity}
      error={form.formErrors.fieldError(
        "yieldQuantity",
        form.clientErrors.yieldQuantity,
      )}
      onBlur={() => form.formErrors.touchField("yieldQuantity")}
      onChange={(event) => {
        form.formErrors.clearFieldError("yieldQuantity");
        form.setYieldQuantity(event.target.value);
      }}
    />
    <Select
      label="Yield unit"
      required
      value={form.yieldUnit}
      error={form.formErrors.fieldErrors.yieldUnit}
      onChange={(value) => {
        form.formErrors.clearFieldError("yieldUnit");
        form.setYieldUnit(value as InventoryUnitDto);
      }}
      options={INVENTORY_UNITS.map((unit) => ({ value: unit, label: unit }))}
    />
    <Input
      label="Yield % (optional)"
      type="number"
      min="0.01"
      max="100"
      step="0.01"
      value={form.yieldPercent}
      error={form.formErrors.fieldError(
        "yieldPercent",
        form.clientErrors.yieldPercent,
      )}
      onBlur={() => form.formErrors.touchField("yieldPercent")}
      onChange={(event) => {
        form.formErrors.clearFieldError("yieldPercent");
        form.setYieldPercent(event.target.value);
      }}
      placeholder="100"
    />
  </div>
);
