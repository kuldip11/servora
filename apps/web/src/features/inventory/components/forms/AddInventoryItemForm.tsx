import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createInventoryItemSchema,
  type CreateInventoryItemInput,
} from "@pos/validation";
import { Button, FormErrorSummary, Input, Select } from "@pos/ui";
import { INVENTORY_UNIT_OPTIONS } from "@/features/inventory/constants";
import { useAddInventoryItem } from "@/features/inventory/hooks/useAddInventoryItem";
import { mapInventoryItemFormToRequest } from "@/features/inventory/helpers/inventory-form.mapper";
import { useFormApiErrors } from "@/shared/hooks/useFormApiErrors";

const addInventoryFieldPaths = [
  "name",
  "unit",
  "currentStock",
  "minimumStock",
  "reorderPoint",
  "costPerUnit",
  "branchId",
] as const satisfies readonly (keyof CreateInventoryItemInput)[];

const defaultValues: CreateInventoryItemInput = {
  name: "",
  unit: "KG",
  currentStock: 0,
  minimumStock: 0,
  reorderPoint: 0,
  costPerUnit: 0,
  branchId: undefined,
};

interface Props {
  aggregate: boolean;
  branches: { id: string; name: string }[];
  onCancel: () => void;
  onSuccess: () => void;
}

export const AddInventoryItemForm = ({
  aggregate,
  branches,
  onCancel,
  onSuccess,
}: Props) => {
  const form = useForm<CreateInventoryItemInput>({
    resolver: zodResolver(createInventoryItemSchema),
    defaultValues,
    mode: "onTouched",
    reValidateMode: "onChange",
  });
  const mutation = useAddInventoryItem();
  const { formErrorMessages, clearFormErrors, handleApiError } =
    useFormApiErrors<CreateInventoryItemInput>();

  const submit = form.handleSubmit(async (values) => {
    clearFormErrors();
    try {
      await mutation.mutateAsync(mapInventoryItemFormToRequest(values));
      form.reset(defaultValues);
      onSuccess();
    } catch (error) {
      handleApiError(
        error,
        form.setError,
        addInventoryFieldPaths,
        "Failed to add inventory item",
      );
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input
        label="Item name"
        required
        placeholder="e.g. Chicken Breast"
        error={form.formState.errors.name?.message}
        {...form.register("name")}
      />
      <Select
        label="Unit"
        required
        options={INVENTORY_UNIT_OPTIONS}
        error={form.formState.errors.unit?.message}
        {...form.register("unit")}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Current Stock"
          required
          type="number"
          min="0"
          step="0.001"
          error={form.formState.errors.currentStock?.message}
          {...form.register("currentStock", { valueAsNumber: true })}
        />
        <Input
          label="Minimum Stock"
          required
          type="number"
          min="0"
          step="0.001"
          error={form.formState.errors.minimumStock?.message}
          {...form.register("minimumStock", { valueAsNumber: true })}
        />
        <Input
          label="Reorder Point"
          required
          type="number"
          min="0"
          step="0.001"
          error={form.formState.errors.reorderPoint?.message}
          {...form.register("reorderPoint", { valueAsNumber: true })}
        />
        <Input
          label="Cost per Unit (₹)"
          required
          type="number"
          min="0"
          step="0.01"
          error={form.formState.errors.costPerUnit?.message}
          {...form.register("costPerUnit", { valueAsNumber: true })}
        />
      </div>
      {aggregate ? (
        <Select
          label="Branch"
          required
          options={[
            { value: "", label: "Select branch" },
            ...branches.map((branch) => ({
              value: branch.id,
              label: branch.name,
            })),
          ]}
          error={form.formState.errors.branchId?.message}
          {...form.register("branchId")}
        />
      ) : null}
      <FormErrorSummary messages={formErrorMessages} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={mutation.isPending}
          disabled={
            !form.formState.isValid ||
            mutation.isPending ||
            form.formState.isSubmitting ||
            (aggregate && !form.watch("branchId"))
          }
        >
          {mutation.isPending ? "Adding…" : "Add Item"}
        </Button>
      </div>
    </form>
  );
};
