import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  Modal,
  Input,
  Select,
  Spinner,
  Badge,
} from "@pos/ui";
import { formatCurrency } from "@/shared/utils";
import { useModifierGroups } from "@/features/menu/hooks/useModifierGroups";
import { useSaveModifierGroup } from "@/features/menu/hooks/useSaveModifierGroup";
import { useDeleteModifierGroup } from "@/features/menu/hooks/useDeleteModifierGroup";
import type { ModifierGroup } from "@pos/types";
import {
  modifierGroupFormSchema,
  type ModifierGroupFormValues,
} from "@pos/validation";

const emptyGroup: ModifierGroupFormValues = {
  name: "",
  selectionType: "SINGLE",
  groupType: "ADDON",
  minSelections: "0",
  maxSelections: "",
  options: [{ name: "", additionalPrice: "0", maxQuantity: "1" }],
  dependsOnOptionId: null,
};

export const ModifierGroupsSection = () => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ModifierGroup | null>(null);

  const { data: groups, isLoading } = useModifierGroups();
  const saveMutation = useSaveModifierGroup();
  const deleteMutation = useDeleteModifierGroup();

  const {
    register,
    control,
    reset,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ModifierGroupFormValues>({
    resolver: zodResolver(modifierGroupFormSchema),
    defaultValues: emptyGroup,
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "options",
  });

  function openCreate() {
    setEditing(null);
    reset(emptyGroup);
    setShowForm(true);
  }

  function openEdit(group: ModifierGroup) {
    setEditing(group);
    reset({
      name: group.name,
      selectionType: group.selectionType,
      groupType: group.groupType ?? "ADDON",
      minSelections: String(group.minSelections),
      maxSelections:
        group.maxSelections != null ? String(group.maxSelections) : "",
      dependsOnOptionId: group.dependsOnOptionId ?? null,
      options: group.options.length
        ? group.options.map((o) => ({
            id: o.id,
            name: o.name,
            additionalPrice: String(o.additionalPrice),
            maxQuantity: String(o.maxQuantity),
            isDefault: o.isDefault ?? false,
            replacesDefaultComponent: o.replacesDefaultComponent ?? "",
          }))
        : [{ name: "", additionalPrice: "0", maxQuantity: "1" }],
    });
    setShowForm(true);
  }

  function handleSave(values: ModifierGroupFormValues) {
    const payload = {
      name: values.name.trim(),
      selectionType: values.selectionType,
      groupType: values.groupType,
      minSelections: Number(values.minSelections),
      ...(values.maxSelections !== "" && {
        maxSelections: Number(values.maxSelections),
      }),
      dependsOnOptionId: values.dependsOnOptionId ?? null,
      options: values.options.map((o) => ({
        ...(o.id ? { id: o.id } : {}),
        name: o.name.trim(),
        additionalPrice: Number(o.additionalPrice),
        maxQuantity: Number(o.maxQuantity),
        isDefault: o.isDefault ?? false,
        ...(o.replacesDefaultComponent?.trim()
          ? { replacesDefaultComponent: o.replacesDefaultComponent.trim() }
          : {}),
      })),
    };
    saveMutation.mutate(
      { existingId: editing?.id ?? null, payload },
      {
        onSuccess: () => {
          setShowForm(false);
          setEditing(null);
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Modifier Groups
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Reusable option sets like "Choose your sides" — define once, attach
            to any item.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" /> New Group
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="w-5 h-5" />
        </div>
      ) : !groups?.length ? (
        <EmptyState
          icon={Plus}
          title="No modifier groups yet"
          description='Create one like "Choose your sides" or "Extras" to attach to menu items.'
          action={
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4" /> New Group
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {groups.map((group) => (
            <Card key={group.id}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {group.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge
                      variant={
                        group.selectionType === "SINGLE" ? "info" : "default"
                      }
                    >
                      {group.selectionType === "SINGLE"
                        ? "Pick one"
                        : "Pick multiple"}
                    </Badge>
                    {group.minSelections > 0 && (
                      <Badge variant="warning">Required</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => openEdit(group)}
                    className="p-1.5 text-text-disabled hover:text-primary"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete "${group.name}"?`))
                        deleteMutation.mutate(group.id);
                    }}
                    className="p-1.5 text-text-disabled hover:text-danger"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {group.options.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between text-xs text-text-secondary"
                  >
                    <span
                      className={
                        !o.isAvailable ? "line-through text-text-disabled" : ""
                      }
                    >
                      {o.name}
                    </span>
                    <span>
                      {parseFloat(String(o.additionalPrice)) > 0
                        ? `+${formatCurrency(parseFloat(String(o.additionalPrice)))}`
                        : "Free"}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit Modifier Group" : "New Modifier Group"}
        size="lg"
      >
        <form
          onSubmit={handleSubmit(handleSave)}
          className="space-y-4 max-h-[70vh] overflow-y-auto pr-1"
        >
          <Input
            label="Group name"
            placeholder="Choose your sides"
            error={errors.name?.message}
            {...register("name")}
          />

          <div className="grid grid-cols-3 gap-3">
            <Controller
              control={control}
              name="groupType"
              render={({ field }) => (
                <Select
                  label="Group type"
                  value={field.value}
                  options={[
                    { value: "ADDON", label: "Addon" },
                    { value: "SUBSTITUTION", label: "Substitution" },
                  ]}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              control={control}
              name="selectionType"
              render={({ field }) => (
                <Select
                  label="Selection"
                  value={field.value}
                  options={[
                    { value: "SINGLE", label: "Pick one" },
                    { value: "MULTIPLE", label: "Pick multiple" },
                  ]}
                  onChange={field.onChange}
                />
              )}
            />
            <Input
              label="Min required"
              type="number"
              min="0"
              error={errors.minSelections?.message}
              {...register("minSelections")}
            />
            <Input
              label="Max allowed"
              type="number"
              min="1"
              placeholder="No limit — leave blank"
              error={errors.maxSelections?.message}
              {...register("maxSelections")}
            />
          </div>
          <p className="text-xs text-text-disabled -mt-2">
            Min 0 = optional. Leave max blank for no limit on how many a guest
            can pick.
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
                  ...(groups ?? [])
                    .filter((group) => group.id !== editing?.id)
                    .flatMap((group) =>
                      group.options.map((option) => ({
                        value: option.id,
                        label: `${group.name} → ${option.name}`,
                      })),
                    ),
                ]}
                onChange={(value) => field.onChange(value || null)}
              />
            )}
          />

          <div>
            <p className="text-sm font-medium text-text-primary mb-2">
              Options
            </p>
            <div className="space-y-2">
              {fields.map((field, i) => (
                <div key={field.id} className="space-y-1">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Option name (e.g. Aachar)"
                        aria-label={`Option ${i + 1} name`}
                        error={errors.options?.[i]?.name?.message}
                        {...register(`options.${i}.name`)}
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="₹0"
                        aria-label={`Option ${i + 1} additional price`}
                        error={errors.options?.[i]?.additionalPrice?.message}
                        {...register(`options.${i}.additionalPrice`)}
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        aria-label={`Option ${i + 1} max quantity`}
                        error={errors.options?.[i]?.maxQuantity?.message}
                        {...register(`options.${i}.maxQuantity`)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      aria-label={`Remove option ${i + 1}`}
                      className="p-2 mt-1.5 text-text-disabled hover:text-danger"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <label className="mt-2 flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        {...register(`options.${i}.isDefault`)}
                      />{" "}
                      Default
                    </label>
                    <div className="w-32">
                      <Input
                        placeholder="Replaces (e.g. Fries)"
                        {...register(`options.${i}.replacesDefaultComponent`)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {typeof errors.options?.message === "string" && (
              <p className="text-xs text-danger mt-1">
                {errors.options.message}
              </p>
            )}
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

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={saveMutation.isPending}
              disabled={!isDirty && !editing}
            >
              {editing ? "Save Changes" : "Create Group"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
