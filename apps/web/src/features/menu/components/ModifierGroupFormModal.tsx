import { Controller, useFieldArray, useForm } from "react-hook-form";
import type { FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { Button, FormErrorSummary, Input, Modal, Select } from "@pos/ui";
import type { ModifierGroup } from "@pos/types";
import {
  modifierGroupFormSchema,
  type ModifierGroupFormValues,
} from "@pos/validation";
import { useFormApiErrors } from "@/shared/hooks/useFormApiErrors";

export const EMPTY_MODIFIER_GROUP: ModifierGroupFormValues = {
  name: "",
  selectionType: "SINGLE",
  groupType: "ADDON",
  minSelections: "0",
  maxSelections: "",
  options: [{ name: "", additionalPrice: "0", maxQuantity: "1" }],
  dependsOnOptionId: null,
};

export const toModifierGroupFormValues = (
  group: ModifierGroup,
): ModifierGroupFormValues => ({
  name: group.name,
  selectionType: group.selectionType,
  groupType: group.groupType ?? "ADDON",
  minSelections: String(group.minSelections),
  maxSelections: group.maxSelections != null ? String(group.maxSelections) : "",
  dependsOnOptionId: group.dependsOnOptionId ?? null,
  options: group.options.length
    ? group.options.map((option) => ({
        id: option.id,
        name: option.name,
        additionalPrice: String(option.additionalPrice),
        maxQuantity: String(option.maxQuantity),
        isDefault: option.isDefault ?? false,
        replacesDefaultComponent: option.replacesDefaultComponent ?? "",
      }))
    : [{ name: "", additionalPrice: "0", maxQuantity: "1" }],
});

type Props = {
  open: boolean;
  editing: ModifierGroup | null;
  groups: ModifierGroup[];
  isSaving: boolean;
  dependencyBlocked: boolean;
  onClose: () => void;
  onSave: (
    editing: ModifierGroup | null,
    values: ModifierGroupFormValues,
    onError: (
      error: unknown,
      setError: ReturnType<typeof useForm<ModifierGroupFormValues>>["setError"],
    ) => void,
  ) => Promise<void>;
};

export const ModifierGroupFormModal = ({
  open,
  editing,
  groups,
  isSaving,
  dependencyBlocked,
  onClose,
  onSave,
}: Props) => {
  const {
    register,
    control,
    reset,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isValid },
  } = useForm<ModifierGroupFormValues>({
    resolver: zodResolver(modifierGroupFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: editing
      ? toModifierGroupFormValues(editing)
      : EMPTY_MODIFIER_GROUP,
    values: editing ? toModifierGroupFormValues(editing) : EMPTY_MODIFIER_GROUP,
    resetOptions: { keepDefaultValues: false },
  });
  const { formErrorMessages, clearFormErrors, handleApiError } =
    useFormApiErrors<ModifierGroupFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "options",
  });

  const close = () => {
    clearFormErrors();
    reset(editing ? toModifierGroupFormValues(editing) : EMPTY_MODIFIER_GROUP);
    onClose();
  };

  const submit = async (values: ModifierGroupFormValues) => {
    clearFormErrors();
    await onSave(editing, values, (error, setter) => {
      const optionFields = values.options.flatMap((_, index) => [
        `options.${index}.name`,
        `options.${index}.additionalPrice`,
        `options.${index}.maxQuantity`,
        `options.${index}.isDefault`,
        `options.${index}.replacesDefaultComponent`,
      ]) as FieldPath<ModifierGroupFormValues>[];
      handleApiError(
        error,
        setter,
        [
          "name",
          "selectionType",
          "groupType",
          "minSelections",
          "maxSelections",
          "dependsOnOptionId",
          ...optionFields,
        ],
        "Failed to save modifier group",
      );
    });
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={editing ? "Edit Modifier Group" : "New Modifier Group"}
      size="lg"
    >
      <form
        onSubmit={handleSubmit(submit)}
        className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
      >
        <FormErrorSummary messages={formErrorMessages} />
        <Input
          label="Group name"
          required
          placeholder="Choose your sides"
          error={errors.name?.message}
          {...register("name", { onChange: clearFormErrors })}
        />

        <div className="grid grid-cols-3 gap-3">
          <Controller
            control={control}
            name="groupType"
            render={({ field }) => (
              <Select
                label="Group type"
                required
                value={field.value}
                options={[
                  { value: "ADDON", label: "Addon" },
                  { value: "SUBSTITUTION", label: "Substitution" },
                ]}
                onChange={(value) => {
                  clearFormErrors();
                  field.onChange(value);
                }}
              />
            )}
          />
          <Controller
            control={control}
            name="selectionType"
            render={({ field }) => (
              <Select
                label="Selection"
                required
                value={field.value}
                options={[
                  { value: "SINGLE", label: "Pick one" },
                  { value: "MULTIPLE", label: "Pick multiple" },
                ]}
                onChange={(value) => {
                  clearFormErrors();
                  field.onChange(value);
                }}
              />
            )}
          />
          <Input
            label="Min required"
            required
            type="number"
            min="0"
            error={errors.minSelections?.message}
            {...register("minSelections", { onChange: clearFormErrors })}
          />
          <Input
            label="Max allowed"
            type="number"
            min="1"
            placeholder="No limit — leave blank"
            error={errors.maxSelections?.message}
            {...register("maxSelections", { onChange: clearFormErrors })}
          />
        </div>
        <p className="-mt-2 text-xs text-text-disabled">
          Min 0 = optional. Leave max blank for no limit on how many a guest can
          pick.
        </p>
        <Controller
          control={control}
          name="dependsOnOptionId"
          render={({ field }) => (
            <Select
              label="Show only after option"
              value={field.value ?? ""}
              options={[
                { value: "", label: "Always show" },
                ...groups
                  .filter((group) => group.id !== editing?.id)
                  .flatMap((group) =>
                    group.options.map((option) => ({
                      value: option.id,
                      label: `${group.name} → ${option.name}`,
                    })),
                  ),
              ]}
              onChange={(value) => {
                clearFormErrors();
                field.onChange(value || null);
              }}
            />
          )}
        />

        <div>
          <p className="mb-2 text-sm font-medium text-text-primary">Options</p>
          <div className="space-y-2">
            <div
              className="hidden items-center gap-2 text-xs font-medium text-text-secondary md:flex"
              aria-hidden="true"
            >
              <span className="flex-1">
                Option name <span className="text-danger">*</span>
              </span>
              <span className="w-24">
                Price <span className="text-danger">*</span>
              </span>
              <span className="w-24">
                Max qty <span className="text-danger">*</span>
              </span>
              <span className="w-8" />
              <span className="w-[4.25rem]">Default</span>
              <span className="w-32">Replaces</span>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <div className="flex-1">
                  <Input
                    required
                    placeholder="Option name (e.g. Aachar)"
                    aria-label={`Option ${index + 1} name`}
                    error={errors.options?.[index]?.name?.message}
                    {...register(`options.${index}.name`, {
                      onChange: clearFormErrors,
                    })}
                  />
                </div>
                <div className="w-24">
                  <Input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="₹0"
                    aria-label={`Option ${index + 1} additional price`}
                    error={errors.options?.[index]?.additionalPrice?.message}
                    {...register(`options.${index}.additionalPrice`, {
                      onChange: clearFormErrors,
                    })}
                  />
                </div>
                <div className="w-24">
                  <Input
                    required
                    type="number"
                    min="1"
                    placeholder="Qty"
                    aria-label={`Option ${index + 1} max quantity`}
                    error={errors.options?.[index]?.maxQuantity?.message}
                    {...register(`options.${index}.maxQuantity`, {
                      onChange: clearFormErrors,
                    })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remove option ${index + 1}`}
                  className="mt-1.5 p-2 text-text-disabled hover:text-danger"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
                <label className="mt-2 flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    {...register(`options.${index}.isDefault`, {
                      onChange: clearFormErrors,
                    })}
                  />
                  Default
                </label>
                <div className="w-32">
                  <Input
                    placeholder="Replaces (e.g. Fries)"
                    {...register(`options.${index}.replacesDefaultComponent`, {
                      onChange: clearFormErrors,
                    })}
                  />
                </div>
              </div>
            ))}
          </div>
          {typeof errors.options?.message === "string" ? (
            <p className="mt-1 text-xs text-danger">{errors.options.message}</p>
          ) : null}
          <button
            type="button"
            onClick={() =>
              append({
                name: "",
                additionalPrice: "0",
                maxQuantity: "1",
                isDefault: false,
                replacesDefaultComponent: "",
              })
            }
            className="mt-2 text-xs font-medium text-primary hover:text-primary-hover"
          >
            + Add option
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSaving}
            disabled={!isValid || !isDirty || isSaving || dependencyBlocked}
          >
            {editing ? "Save Changes" : "Create Group"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
