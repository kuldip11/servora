import { Button, FormErrorSummary, Input, Select } from "@pos/ui";
import type { Promotion } from "@pos/types";
import type { usePromotionFormState } from "@/features/menu/hooks/usePromotionFormState";
import { PromotionBogoFields } from "./PromotionBogoFields";
import { PromotionScheduleFields } from "./PromotionScheduleFields";

type PromotionFormState = ReturnType<typeof usePromotionFormState>;
type ErrorMap = Record<string, string | undefined>;
type Option = { value: string; label: string };

type Props = {
  form: PromotionFormState;
  clientErrors: ErrorMap;
  fieldErrors: Record<string, string>;
  formErrorMessages: string[];
  itemOptions: Option[];
  categoryOptions: Option[];
  fieldError: (field: string, clientError?: string) => string | undefined;
  clearFieldError: (field: string) => void;
  touchField: (field: string) => void;
  invalid: boolean;
  dependencyFailed: boolean;
  saving: boolean;
  onSubmit: () => void;
  onCancel: () => void;
};

export const PromotionForm = ({
  form,
  clientErrors,
  fieldErrors,
  formErrorMessages,
  itemOptions,
  categoryOptions,
  fieldError,
  clearFieldError,
  touchField,
  invalid,
  dependencyFailed,
  saving,
  onSubmit,
  onCancel,
}: Props) => (
  <div className="grid max-w-5xl gap-3 rounded-xl border border-border p-4 md:grid-cols-3">
    <div className="md:col-span-3">
      <FormErrorSummary messages={formErrorMessages} />
    </div>
    <Input
      label="Name"
      required
      value={form.name}
      error={fieldError("name", clientErrors.name)}
      onBlur={() => touchField("name")}
      onChange={(event) => {
        clearFieldError("name");
        form.setName(event.target.value);
      }}
    />
    <Select
      label="Type"
      required
      value={form.ruleType}
      onChange={(value) => form.setRuleType(value as Promotion["ruleType"])}
      options={[
        { value: "PERCENTAGE", label: "Percentage" },
        { value: "FIXED_AMOUNT", label: "Fixed amount" },
        { value: "BOGO", label: "Buy / get" },
      ]}
    />
    {form.ruleType !== "BOGO" ? (
      <>
        <Input
          label={form.ruleType === "PERCENTAGE" ? "Percent off" : "Amount off"}
          required
          type="number"
          value={form.value}
          error={fieldError("value", clientErrors.value)}
          onBlur={() => touchField("value")}
          onChange={(event) => {
            clearFieldError("value");
            form.setValue(event.target.value);
          }}
        />
        <Select
          label="Scope"
          required
          value={form.scope}
          onChange={(value) => form.setScope(value as Promotion["scope"])}
          options={[
            { value: "ORDER", label: "Whole order" },
            { value: "CATEGORY", label: "Category" },
            { value: "ITEM", label: "Menu item" },
          ]}
        />
        {form.scope !== "ORDER" ? (
          <Select
            label={form.scope === "CATEGORY" ? "Category" : "Menu item"}
            required
            value={form.targetId}
            options={[
              {
                value: "",
                label:
                  form.scope === "CATEGORY"
                    ? "Choose a category"
                    : "Choose an item",
              },
              ...(form.scope === "CATEGORY" ? categoryOptions : itemOptions),
            ]}
            error={fieldError("targetId", clientErrors.targetId)}
            onBlur={() => touchField("targetId")}
            onChange={(value) => {
              clearFieldError("targetId");
              form.setTargetId(value);
            }}
          />
        ) : null}
      </>
    ) : (
      <PromotionBogoFields
        form={form}
        clientErrors={clientErrors}
        itemOptions={itemOptions}
        categoryOptions={categoryOptions}
        fieldError={fieldError}
        clearFieldError={clearFieldError}
        touchField={touchField}
      />
    )}
    <PromotionScheduleFields
      form={form}
      clientErrors={clientErrors}
      fieldErrors={fieldErrors}
      fieldError={fieldError}
      clearFieldError={clearFieldError}
      touchField={touchField}
    />
    <label className="flex items-center gap-2 text-sm text-text-secondary">
      <input
        type="checkbox"
        checked={form.stackableWithLoyalty}
        onChange={(event) => form.setStackableWithLoyalty(event.target.checked)}
      />
      Stackable with loyalty
    </label>
    <div className="flex items-end gap-2">
      <Button
        disabled={saving || invalid || !form.isDirty || dependencyFailed}
        loading={saving}
        onClick={onSubmit}
      >
        {form.editingId ? "Save promotion" : "Create promotion"}
      </Button>
      {form.editingId ? (
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      ) : null}
    </div>
  </div>
);
