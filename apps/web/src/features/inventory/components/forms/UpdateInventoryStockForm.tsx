import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updateInventoryStockSchema,
  type UpdateInventoryStockInput,
} from "@pos/validation";
import { Button, FormErrorSummary, Input, Select } from "@pos/ui";
import type { InventoryItem } from "@pos/types";
import { INVENTORY_TRANSACTION_OPTIONS } from "@/features/inventory/constants";
import { useUpdateInventoryStock } from "@/features/inventory/hooks/useUpdateInventoryStock";
import { mapStockUpdateFormToRequest } from "@/features/inventory/helpers/inventory-form.mapper";
import { useFormApiErrors } from "@/shared/hooks/useFormApiErrors";

const stockFieldPaths = [
  "quantity",
  "transactionType",
  "notes",
] as const satisfies readonly (keyof UpdateInventoryStockInput)[];

interface Props {
  item: InventoryItem;
  onCancel: () => void;
  onSuccess: () => void;
}

export const UpdateInventoryStockForm = ({
  item,
  onCancel,
  onSuccess,
}: Props) => {
  const form = useForm<UpdateInventoryStockInput>({
    resolver: zodResolver(updateInventoryStockSchema),
    defaultValues: { quantity: 0, transactionType: "IN", notes: "" },
    mode: "onChange",
  });
  const mutation = useUpdateInventoryStock();
  const { formErrorMessages, clearFormErrors, handleApiError } =
    useFormApiErrors<UpdateInventoryStockInput>();

  const submit = form.handleSubmit(async (values) => {
    clearFormErrors();
    try {
      await mutation.mutateAsync({
        itemId: item.id,
        input: mapStockUpdateFormToRequest(values),
      });
      form.reset({ quantity: 0, transactionType: "IN", notes: "" });
      onSuccess();
    } catch (error) {
      handleApiError(
        error,
        form.setError,
        stockFieldPaths,
        "Failed to update stock",
      );
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <Select
        label="Transaction Type"
        options={INVENTORY_TRANSACTION_OPTIONS}
        error={form.formState.errors.transactionType?.message}
        {...form.register("transactionType")}
      />
      <Input
        label="Quantity"
        type="number"
        min="0.001"
        step="0.001"
        error={form.formState.errors.quantity?.message}
        hint={`Current stock: ${parseFloat(String(item.currentStock ?? 0)).toFixed(2)} ${item.unit}`}
        {...form.register("quantity", { valueAsNumber: true })}
      />
      <Input
        label="Notes (optional)"
        placeholder="Reason for update..."
        error={form.formState.errors.notes?.message}
        {...form.register("notes")}
      />
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
            form.formState.isSubmitting
          }
        >
          {mutation.isPending ? "Updating…" : "Update"}
        </Button>
      </div>
    </form>
  );
};
